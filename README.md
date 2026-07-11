# PulseCrypto

A real-time cryptocurrency market viewer with a Node.js **market data gateway** and a **React Native (Expo)** mobile client. Consumes Binance public streams, coalesces high-frequency updates at configurable intervals, and delivers only fresh state to mobile clients under strict backpressure control.

---

## Table of contents
1. [Platform choice](#platform-choice)
2. [Setup and prerequisites](#setup-and-prerequisites)
3. [Running the app](#running-the-app)
4. [Architecture overview](#architecture-overview)
5. [Backpressure strategy (backend)](#backpressure-strategy-backend)
6. [State management strategy (mobile)](#state-management-strategy-mobile)
7. [Connection resilience](#connection-resilience)
8. [Offline behaviour](#offline-behaviour)
9. [Error handling](#error-handling)
10. [Testing](#testing)
11. [WS payload contract](#ws-payload-contract)
12. [Design decisions & trade-offs](#design-decisions--trade-offs)
13. [Assumptions](#assumptions)
14. [Non-goals](#non-goals)
15. [AI-assisted development](#ai-assisted-development)
16. [Repo layout](#repo-layout)

---

## Platform choice

**Expo Managed (SDK 57)** on the mobile side, over React Native CLI *and* over Expo Bare.

- **vs. React Native CLI:** Expo gives us `expo-router`, `expo-font`, `expo-network`, and a working Fast Refresh dev loop with zero native-project babysitting. Nothing in this app requires a custom native module.
- **vs. Expo Bare (`prebuild` / `eas build`):** Managed lets the app run in stock **Expo Go** without installing Xcode / Android Studio toolchains or building a custom dev client. Bare would be required only if we needed MMKV, an unlisted native API, or a native module the SDK doesn't ship — none apply here.

Trade-offs: no unreleased native APIs, no custom C++, ~15 MB extra bundle from the Expo runtime. Acceptable at this scope.

**Backend** is plain Node.js + Fastify + `ws` — no framework wrapping, chosen for direct control over the WebSocket lifecycle and per-client emit loop, which is the load-bearing logic of the whole system.

---

## Setup and prerequisites

- **Node.js ≥ 20** (repo pins v20 via `.nvmrc`)
- **npm ≥ 10** (npm workspaces; no external tooling required)
- **Expo Go** on the Android emulator or iOS simulator (SDK 57)

```bash
git clone https://github.com/chamile/chamila-PulseCrypto.git pulsecrypto
cd pulsecrypto
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because Expo pins some peer ranges tighter than the workspace resolution graph allows. This is Expo's own recommended pattern for npm workspace monorepos.

## Running the app

### 1. Start the backend

```bash
npm run dev:backend
```

The gateway starts on `http://localhost:8080`, bound to `0.0.0.0` so an Android emulator can reach it. Live logs will show the Binance upstream connection, tick emission, and client activity.

Verify it's up:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/pairs/meta
```

### 2. Start the mobile app

In a separate terminal:
```bash
npm run mobile
```

Then press:
- `i` to open on the iOS simulator (optional)
- `a` to open on the Android emulator (assumes an emulator is already running)

The mobile app is configured to reach the backend at:
- **Android emulator:** `10.0.2.2:8080` (the emulator's alias for the host)
- **iOS simulator:** `localhost:8080`
- Override via `EXPO_PUBLIC_SERVER_HOST` and `EXPO_PUBLIC_SERVER_PORT`.

### 3. Configuration knobs (backend env)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP + WS port |
| `HOST` | `0.0.0.0` | Bind host |
| `EMIT_INTERVAL_MS` | `100` | Global coalesce cadence (per-client override via Settings screen) |
| `MAX_BUFFERED_BYTES` | `1000000` | Slow-consumer trigger threshold |
| `MAX_STRIKES` | `10` | Consecutive slow ticks before disconnect |
| `PING_INTERVAL_MS` | `15000` | Downstream heartbeat |
| `DEPTH_LEVELS` | `20` | Order book top-N |

---

## Architecture overview

```
   ┌────────────┐   depth20+    ┌─────────────────────┐      ws://…/ws       ┌────────────────────────┐
   │  Binance   │───ticker────► │      backend        │─────────────────────►│   mobile client        │
   │  streams   │               │  (Fastify + ws)     │                      │  (Expo / React Native) │
   └────────────┘               │                     │                      │                        │
                                │  MarketState        │       GET /pairs/meta│  wsClient (state       │
                                │  (coalesced,        │◄─────────────────────│    machine + backoff)  │
                                │   1 snapshot/pair)  │       GET /health    │                        │
                                │                     │◄─────────────────────│  dispatchWsMessage     │
                                │  per-client emit    │                      │    → 16 ms coalescer   │
                                │  loop @ configured  │                      │    → per-pair Zustand  │
                                │  interval           │                      │                        │
                                │                     │                      │  restClient            │
                                │  bounded send +     │                      │    → NetError shape    │
                                │  strike-based drop  │                      │    → ErrorBanner       │
                                └─────────────────────┘                      └────────────────────────┘
```

**Backend (`packages/backend/`):**
- **Upstream:** one combined WebSocket to Binance carrying `@depth20@100ms` + `@ticker` for all 5 pairs. *(one connection to Binance, not many)*
- **State:** `MarketState` keeps one in-memory snapshot per pair; every incoming Binance message overwrites it. Memory is bounded by pair count, not by input rate. *(only the newest data is kept — memory can't grow)*
- **Emit:** each connected client runs its own emit loop at its configured interval (default 100 ms). On tick, the client-loop reads the current state, computes derived fields (spread, buyPressure, sellPressure), and sends to that client. *(each app gets updates at its own chosen speed)*
- **Backpressure:** every send checks `ws.bufferedAmount`. If it exceeds the threshold, the tick is dropped (never queued). After `MAX_STRIKES` consecutive drops, the connection is closed with WS status `1013 slow consumer`. *(skip updates for slow phones; disconnect them if they stay slow)*

**Mobile (`packages/mobile/`):**
- **Ingress:** `wsClient` is a plain TS state machine (`idle → connecting → open → reconnecting → offline`) with exponential backoff + jitter, app-lifecycle awareness, and a network poller. Not a React hook — nothing subscribes at connection level. *(manages the live connection to the server)*
- **Second-tier coalescer:** `dispatchWsMessage` mirrors the server pattern — incoming ticks land in a pending map (latest-wins per pair), flushed via `setTimeout(16 ms)`. Even at a 10 ms server interval, React sees ≤ 60 store writes/sec. *(skips outdated updates so the phone stays smooth)*
- **State:** one Zustand store per pair (`Map<Pair, StoreApi<PairState>>`). Rows subscribe by selector, so a BTC tick cannot re-render the DOGE row. Separate stores for connection, meta, favourites, and selected-pair. *(only the row that changed re-draws)*
- **REST + errors:** `restClient` throws a typed `NetError` (`kind`, `message`, `retryable`). `metaStore` stores the error; `<ErrorBanner>` renders a kind-specific title with a retry button gated on `retryable`. *(clear error messages with a retry button)*

**Shared (`packages/contracts/`):** Zod schemas and TS types used at both ends. Payload changes are compile errors on both sides, not runtime bugs.

---

## Backpressure strategy (backend)

This is the central engineering problem. The assignment explicitly requires:

- *Buffer and/or batch incoming updates.*
- *Emit processed updates to connected mobile clients at a configurable interval (default: 100ms).*
- *Prevent slow consumers from causing unbounded memory growth.*

### How the load looks

- `@depth20@100ms`: 10 msgs/sec/pair × 5 pairs = ~50 msgs/sec baseline
- `@ticker`: ~5 msgs/sec across all pairs
- During market events: bursts to 100+ msgs/sec

### Chosen pattern — **coalesce, don't queue**

Rather than a message queue, we keep a **single latest snapshot per pair** in memory. Every incoming Binance message overwrites its pair's slot. This means:

- **Memory is bounded by construction** — one slot per pair, always.
- **CPU is flat regardless of input rate** — a burst of 500 messages still yields ~10 emits/sec/client, because the emit loop is decoupled from the input rate.
- **What clients see is always fresh** — a snapshot from 20 ms ago never blocks a snapshot from 10 ms ago.

### Per-client bounded send

The trap in a naive fan-out is a *slow consumer*: `ws.send()` doesn't block, so if a mobile client can't drain, its outbound buffer grows unboundedly and eventually OOMs the server. Standard fix:

```ts
if (ws.bufferedAmount > MAX_BUFFERED_BYTES) {
  strikes++
  metrics.onDrop()
  if (strikes > MAX_STRIKES) ws.close(1013, 'slow consumer')
  return   // drop this tick — next tick 100ms later carries fresher state
}
```

Because we coalesce, dropping a tick is **safe** — the next tick carries the newest state. This is what makes the design robust: the same property (coalesce) that gives us flat CPU also makes tick loss recoverable.

### Per-client emit interval (Settings screen)

Each client owns its emit interval. The mobile Settings screen sends a `{type: 'setInterval', ms}` message, and the client-loop is restarted with the new interval. This is the *configurable interval* from the spec, exposed as a UI knob so backpressure behaviour can be watched live (visible on the Telemetry screen).

### What the Telemetry screen proves

The Telemetry screen polls `GET /health` every second and shows:
- **Msgs/sec** — actual Binance ingestion rate
- **Emit interval (ms)** — average across connected clients
- **Avg buffered bytes** — how close clients are to the drop threshold
- **Dropped ticks** — count of coalesce-drops (should be ~0 on a healthy connection)
- **Memory footprint** — bounded even as Binance floods the upstream

The gap between "msgs/sec in" and "10× emit-interval msgs/sec out per client" is the visible proof the coalesce is working.

### Mobile side — mirrored coalesce + selective rendering

The phone applies the same three protections, one level down:

- **Client-side coalesce** — same latest-wins-per-pair trick, flushed every 16 ms (one screen frame). React never sees more than ~60 writes/sec, regardless of ingest rate.
- **Per-pair Zustand stores** — a BTC tick can't re-render the DOGE row.
- **Off-thread animations** — price flashes run on the UI thread via Reanimated, not through React re-renders.

End-to-end for one tick: *server coalesce → per-client throttle → bounded send → mobile coalesce → per-pair store → one row re-render + off-thread flash.* Two coalesces + one drop rule cap every layer, so slamming the slider melts nothing.

---

## State management strategy (mobile)

The assignment's *sustained update bursts* NFR is where wrong choices become visible immediately.

### Chosen pattern — **per-pair Zustand stores**

We keep a `Map<Symbol, StoreApi<PairState>>`. Each trading pair has its **own store**. A watchlist row for `DOGEUSDT` subscribes only to the DOGE store. A `BTCUSDT` tick cannot cause the DOGE row to reconcile.

```ts
export function usePairState<T>(pair: string, selector: (s: PairState) => T): T {
  return useStore(getPairStore(pair), selector);
}
```

Contrast with a single global store: correct behaviour requires disciplined `useSelector` narrowness plus `shallowEqual` on every consumer. Per-pair stores make the correct pattern the *default* pattern.

### Second-tier coalescer on the mobile side

The server-side coalesce caps *emission* rate, but a user cranking the emit interval down to 10 ms in Settings still produces ~500 msg/sec across 5 pairs — enough to saturate the JS thread on a phone. So the mobile client mirrors the same pattern:

```ts
// packages/mobile/src/state/marketStores.ts
const pending = new Map<string, MarketTick>();      // latest-wins per pair
let scheduled: NodeJS.Timeout | null = null;

function schedule() {
  if (scheduled) return;
  scheduled = setTimeout(flush, 16 /* one frame */);
}

export function dispatchWsMessage(msg: ServerMessage) {
  if (msg.type === 'tick')     { pending.set(msg.pair, msg); schedule() }
  else if (msg.type === 'snapshot') { for (const t of msg.pairs) pending.set(t.pair, t); schedule() }
}
```

Effect: even if 60 ticks for `BTCUSDT` arrive in one 16 ms window, only the newest one reaches Zustand, so React re-renders at most ~60 Hz regardless of ingest rate. The same property that made server-side coalescing correct — *stale ticks are lossy without loss of meaning* — makes the client-side batch drop safe.

### Animations live outside React

Price flash (green up / red down) uses **Reanimated shared values** driven off store updates. The store update triggers one row render; the row's `useEffect` writes to a `useSharedValue`; the flash animates on the UI thread with `withTiming`. **No re-render during the 500 ms flash.**

### Rendering

- The watchlist uses `ScrollView` with memoized `WatchlistRow` components (FlashList was considered — see trade-offs).
- Order-book rows are memoized and keyed by price, so a level shifting position moves its row rather than re-rendering all of them.

### Store surface

- `marketStores` — one store per pair
- `metaStore` — `/pairs/meta` cache with `refresh()` for pull-to-refresh
- `connectionStore` — WS state + debounced "showOffline" flag (2s)
- `favoritesStore` — persisted via AsyncStorage, hydrated on boot
- `selectedPairStore` — which pair the Terminal tab is showing

---

## Connection resilience

The `wsClient` in `packages/mobile/src/net/wsClient.ts` is a plain TS module (not React) that owns the WebSocket lifecycle:

**State machine:** `idle | connecting | open | reconnecting | offline` *(tracks the connection through 5 stages)*

**Reconnect:** exponential backoff `500ms × 2^n`, jittered, capped at 30s. *(retries with growing delays, so it doesn't hammer the server)*

**Lifecycle integration:**
| Trigger | Action |
|---|---|
| App backgrounds | Close WS (save battery, avoid ghost connections) |
| App foregrounds | Reopen WS immediately if online |
| Network goes offline (polled every 3s) | Enter `offline`, close WS, pause reconnect |
| Network returns | Reset attempt count, connect immediately |
| WS closes unexpectedly | Schedule backoff reconnect |

**Debounced UX:** The `connectionStore` waits **2 seconds** before flipping `showOffline` to true. Transient reconnect flaps (< 2s) are invisible to the user — no red banner flicker. *(short blips don't flash a red banner)*

**Initial state on connect:** as soon as a mobile client connects, the server sends a `snapshot` message containing the current tick for every pair. The UI paints instantly rather than showing empty for up to 100 ms while waiting for the first tick. *(screen fills in instantly — no blank pause)*

---

## Offline behaviour

- **Connection status** is always visible in the header (pulse dot + label: `CONNECTED` / `RECONNECTING` / `OFFLINE`). *(you can always see the connection state at a glance)*
- **Last-known data** stays on screen when the connection drops. The Zustand stores are in-memory and not cleared on disconnect. *(prices stay on screen even when offline)*
- **Stale banner** appears on the Terminal screen once `showOffline` is true, indicating the timestamp of the last-received tick. *(tells you how old the numbers are)*
- **Auto-reconnect** happens without user action; when the connection recovers, the server's on-connect snapshot restores the UI to fresh state atomically. *(reconnects on its own — no tap needed)*
- **Favourites persist** across cold starts via AsyncStorage. The store hydrates during app boot, before the first render subscribes. *(favourites are remembered after closing the app)*

---

## Error handling

Errors flow through a single typed shape rather than raw strings, so the UI can render specific messages and decide when to offer a retry.

```ts
// packages/mobile/src/net/errors.ts
export type NetErrorKind = 'network' | 'http' | 'parse' | 'unknown';
export interface NetError {
  kind: NetErrorKind;
  message: string;
  status?: number;
  retryable: boolean;
}
```

- `restClient` throws `NetError` — `TypeError` (fetch failed) becomes `network` (retryable), 5xx / 408 / 429 become `http` (retryable), other 4xx become `http` (non-retryable), Zod schema failures become `parse` (non-retryable). *(every network problem gets a clear label the UI can use)*
- `metaStore.error` is typed as `NetError | null`. A user-facing `<ErrorBanner>` renders a `kind`-appropriate title (`CONNECTION PROBLEM` / `SERVER ERROR` / `BAD RESPONSE`) with a **RETRY** button gated on `retryable`, and a dismiss control. *(shows the problem plainly with a retry button when it makes sense)*
- Backend messages flow through the shared Zod schemas at the WS boundary; malformed frames are dropped with a warning instead of crashing the pipeline. *(a bad message is skipped, not fatal)*

---

## Testing

### Backend (`packages/backend`)

Vitest covers the coalescing invariants in `MarketState` — the load-bearing correctness property of the whole design:

- Sustained-burst input → *one* snapshot per pair (proves last-wins).
- Emitted `MarketTick` conforms to the shared Zod schema (proves boundary contract).
- Spread and buy/sell pressure are computed correctly from top-of-book.
- Empty book returns `null` rather than a false snapshot.

```bash
npm run test --workspace=@pulsecrypto/backend
```

### Mobile (`packages/mobile`)

Vitest suite covers pure logic — no React Native runtime required. The tests exercise the parts most likely to break silently under a firehose:

- `net/errors.test.ts` — retryability rules, `TypeError` → `network` classification, pass-through of already-typed errors.
- `state/marketStores.test.ts` — reducer flash direction (`up` / `down` / *keep* on identical price), routing of `tick` vs `snapshot`, **coalescer collapses bursts** (100 → 101 → 102 = one store write of 102).
- `state/metaStore.test.ts` — refresh success populates `byPair`, HTTP failure stores a typed `NetError` and stops loading, `clearError` clears it.

```bash
npm run test --workspace=@pulsecrypto/mobile
```

Total: **19 mobile tests + 5 backend tests**, run in under a second, all pure logic (no jsdom, no RN test bridge).

---

## WS payload contract

Types are in `packages/contracts/src/index.ts` and shared verbatim between backend and mobile.

**Server → client** (discriminated union on `type`):

```ts
type ServerMessage =
  | { type: 'tick'; pair; ts; price; change24hPct; high24h; low24h; volume24h;
      spread; buyPressure; sellPressure; bids: Level[]; asks: Level[] }
  | { type: 'snapshot'; pairs: MarketTick[] }
  | { type: 'conn'; upstream: 'up' | 'down' }
```

**Client → server:**

```ts
type ClientMessage =
  | { type: 'setInterval'; ms: number }  // reconfigure this client's emit cadence
```

Both directions run through Zod validators at the boundary. Malformed payloads are dropped with a warning.

---

## Design decisions & trade-offs

### `@depth20@100ms` over `@depth` diff stream
Binance's diff-based depth stream requires a REST snapshot bootstrap plus strict `U`/`u` sequencing and resync-on-gap logic. That's a known trap and buys us depth we don't display. The `@depth20@100ms` partial-book stream delivers the top 20 levels every 100ms, no sequencing — **correctness over depth**, better ROI for a market viewer.

### Coalesce (last-wins) over batching (aggregate)
The user cares about the *current state* of the book, not every intermediate tick. Batching (send arrays of all ticks in a window) would be right for a *trade tape* where every trade matters. For an order book, only the latest snapshot is meaningful.

### Zustand over Redux
Zustand's `createStore` outside a React tree makes per-pair store isolation trivial. The same isolation is achievable in Redux via normalized state + narrow selectors, but every consumer needs `shallowEqual` discipline. Zustand makes the correct pattern the default pattern — for the "sustained update bursts" NFR, the lower-boilerplate path is the more defensible one.

### `ScrollView` over `FlashList` for the watchlist
`FlashList` is the right choice for lists of dozens to thousands of items with constant updates. With 5 pairs, the ScrollView-with-memoized-rows pattern is simpler and just as smooth — one less native dep to reason about, no `estimatedItemSize` tuning. Would switch to FlashList at ~20+ pairs.

### AsyncStorage over MMKV
MMKV is faster (synchronous, native) but requires a custom dev client to run. AsyncStorage works in stock Expo Go. For a set of favourite symbols the perf difference is imperceptible.

### `@react-native-community/slider` (native) over gesture-handler slider
Native slider is one less thing to fine-tune and matches the platform. The trade-off is one extra dep.

### JSON over MessagePack / binary
At ~10 ticks/sec/client × ~2KB/tick, JSON is fine. Binary would cut ~40% but adds encode/decode work at both ends and an extra dep on mobile. Note-worthy at 100+ concurrent clients — not at this scale.

### Monorepo over three separate repos
The shared `packages/contracts` (Zod schemas + TS types) is the pivot. In a polyrepo setup it would either be:
- **Published to a registry** — every payload change needs a version bump, a publish, and a dependency-update PR on both sides. Slow and easy to skew.
- **Copy-pasted between repos** — schemas drift silently; server and mobile disagree at runtime instead of at build time.

In a monorepo the contracts package is a workspace import. Change a Zod schema and *both* the backend and the mobile app become compile errors at the same moment — the type system enforces the wire contract before anything ships. This is the single biggest reason for the monorepo choice; the shared `tsconfig`, one-command install, and unified scripts are bonuses.

### npm workspaces over pnpm/Nx/Turborepo
Comes with Node — zero external tooling required. pnpm/Nx are better for 20+ package monorepos; for 3, they're overhead.

### Backpressure metrics as a UI screen
The `/health` endpoint + Telemetry screen is not part of the core data path, but it's the only way to *visually prove* the backend backpressure design is doing what this README claims. Drops stay at 0 while msgs/sec swings by 3×.

### Client-side coalesce with `setTimeout(16)` over `requestAnimationFrame`
`rAF` syncs to the display refresh but has weaker guarantees in React Native when the JS thread is under load. A plain 16 ms `setTimeout` gives a predictable batching window, is trivially testable via `__flushCoalescedForTest`, and (importantly) still keeps the batch window at ~one frame. The upside of `rAF` — pausing while off-screen — doesn't apply here because store updates don't do any rendering work of their own; React reconciles when it wants to.

### Typed `NetError` over string coercion
`String(err)` loses the stack, the kind, and any decision about whether to retry — leaving the UI with a blob it can only render as generic red text. A four-field discriminated shape (`kind`, `message`, `status?`, `retryable`) unlocks: kind-specific banner titles, retry buttons only where meaningful, and a shape testable in isolation. The trade-off is one more mapping layer (`toNetError`), which is one file and never crosses a component boundary.

---

## Assumptions

- No auth or per-client authorization is required (demo scope). In production, WS connections would be JWT-authenticated and per-client subscriptions authorized.
- The backend runs locally alongside the emulator/simulator. No public deployment is provided.
- Binance's public streams are reachable from the host network. If Binance rate-limits the IP, restarting the backend clears the local reconnect backoff.
- `/pairs/meta` returns mocked/derived metadata (24h high/low/volume come from the live ticker stream; display name is hardcoded per pair). This is what the assignment permits.
- The tab bar shows all 5 core pairs; adding pairs is a one-line change in `packages/contracts` (add to `SUPPORTED_PAIRS`).

---

## Non-goals

Explicitly out of scope for this deliverable:

- Historical charts, candlesticks, or time-series analytics
- User accounts, authentication, or session management
- Real trading actions (buy/sell)
- Multi-exchange support
- Push notifications
- Cross-device favourites sync
- Full Binance depth diff sync (see trade-off above)
- MessagePack / binary WS framing (visible as a disabled toggle on the Settings screen — a discoverable extension point, not a working feature)
- Server-side adaptive polling based on client `bufferedAmount` (also a disabled Settings toggle; the current per-client fixed interval + strike-based drop is sufficient for this scope)
- Docker / CI / deployment infrastructure
- Multiple concurrent clients with per-client subscription filtering (all clients receive all pairs)

Each of these is achievable with more time but doesn't map to any graded criterion in the assignment.

---

## AI-assisted development

The assignment invites the use of AI tooling and asks how it was used. Honestly:

- **Claude Code** was used throughout for boilerplate scaffolding (Fastify server bootstrap, Zod schema definitions, component skeletons, style-sheet blocks) and to accelerate documentation.
- **Architectural decisions were driven by me:** the coalesce-vs-batch trade-off, the choice to use `@depth20@100ms` over the diff stream, per-pair Zustand stores, the reconnect state machine boundary between the WS client and connection store, the debounced offline UX, and the decision to expose the per-client emit interval as a Settings knob to visualise backpressure — all judgements I made after weighing alternatives.
- **AI output was reviewed before merging.** Type checks, the runtime shape of Binance's stream envelopes, and the correctness of the depth chart geometry were verified against live data. Nothing was accepted uncritically.
- **The README you're reading was structured by me** to lead with the architectural story (backpressure, state management, resilience) rather than a feature checklist, because that's what the assignment says it's grading.

The philosophy: AI as leverage on the mechanical parts, human judgement on the load-bearing decisions.

---

## Repo layout

```
pulsecrypto/
├── package.json                      # npm workspaces root
├── tsconfig.base.json                # shared strict TS config
├── packages/
│   ├── contracts/                    # shared TS + Zod (WS payload, meta, health)
│   │   └── src/index.ts
│   ├── backend/                      # Fastify + ws upstream + WS server
│   │   └── src/
│   │       ├── config.ts             # env-parsed knobs
│   │       ├── metrics.ts            # rolling counters
│   │       ├── state.ts              # MarketState — coalesced per-pair snapshots
│   │       ├── binanceClient.ts      # combined stream, reconnect, resubscribe
│   │       ├── wsServer.ts           # ConnectedClient — per-client tick + bounded send
│   │       ├── routes.ts             # /pairs/meta + /health
│   │       └── index.ts              # bootstrap
│   └── mobile/                       # Expo Managed SDK 57
│       ├── app/                      # expo-router entry
│       │   ├── _layout.tsx           # fonts, safe area, gesture root, bootstrap
│       │   └── (tabs)/
│       │       ├── _layout.tsx       # 4-tab nav
│       │       ├── markets.tsx       # watchlist + search + favourites + pull-to-refresh + error banner
│       │       ├── terminal.tsx      # detail: price, book, depth chart, chips
│       │       ├── telemetry.tsx     # health polling + gauges + sparkline
│       │       └── settings.tsx      # emit-interval slider (+ stub toggles)
│       ├── vitest.config.ts          # pure-logic test setup (Node env, alias)
│       └── src/
│           ├── theme/                # colors (Figma tokens + info/warn soft variants), spacing, typography
│           ├── components/           # Text, Card, Pill, ConnectionIndicator, ErrorBanner, icons
│           ├── net/
│           │   ├── wsClient.ts       # state machine, exponential backoff, lifecycle
│           │   ├── restClient.ts     # /pairs/meta, /health with Zod validation
│           │   ├── errors.ts         # typed NetError shape + kind classifier
│           │   ├── errors.test.ts    # retryability + classification tests
│           │   └── config.ts         # host/port resolution
│           ├── state/
│           │   ├── marketStores.ts   # per-pair Zustand + client-side coalescer
│           │   ├── marketStores.test.ts
│           │   ├── metaStore.ts      # /pairs/meta cache + typed error state
│           │   ├── metaStore.test.ts
│           │   ├── connectionStore.ts
│           │   ├── favoritesStore.ts
│           │   ├── selectedPairStore.ts
│           │   └── bootstrap.ts      # single-entry wiring (WS → dispatch, initial meta refresh)
│           ├── screens/              # feature-scoped composed screens
│           ├── hooks/                # usePriceFlash, useHealthPoll, useFps
│           └── utils/format.ts       # price/qty/pct/time formatters
```
