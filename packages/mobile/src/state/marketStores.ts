import { createStore, useStore } from 'zustand';
import type { MarketTick, ServerMessage } from '@pulsecrypto/contracts';

export interface PairState {
  tick: MarketTick | null;
  prevPrice: number | null;
  lastFlash: 'up' | 'down' | null;
  update: (t: MarketTick) => void;
}

const stores = new Map<string, ReturnType<typeof makeStore>>();

function makeStore() {
  return createStore<PairState>((set) => ({
    tick: null,
    prevPrice: null,
    lastFlash: null,
    update: (t) =>
      set((s) => {
        const prev = s.tick?.price ?? null;
        const flash: 'up' | 'down' | null =
          prev == null || t.price === prev
            ? s.lastFlash
            : t.price > prev
              ? 'up'
              : 'down';
        return { tick: t, prevPrice: prev, lastFlash: flash };
      }),
  }));
}

export function getPairStore(pair: string) {
  let s = stores.get(pair);
  if (!s) {
    s = makeStore();
    stores.set(pair, s);
  }
  return s;
}

export function usePairState<T>(
  pair: string,
  selector: (s: PairState) => T,
): T {
  return useStore(getPairStore(pair), selector);
}

/**
 * Second-tier coalescer, mirroring the server's per-pair snapshot pattern.
 *
 * Even with the server's per-client interval, a fast setting (e.g. 10 ms)
 * plus 5 pairs is ~500 msg/sec — enough to saturate JS on device. We buffer
 * incoming ticks in a pending map (latest-wins per pair) and flush once per
 * frame window. Stale ticks are dropped before ever reaching React, so
 * render cost is capped by frame rate rather than by ingest rate.
 */
const COALESCE_MS = 16;
let pending = new Map<string, MarketTick>();
let scheduled: ReturnType<typeof setTimeout> | null = null;

function flush() {
  scheduled = null;
  const batch = pending;
  pending = new Map();
  for (const [pair, tick] of batch) {
    getPairStore(pair).getState().update(tick);
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = setTimeout(flush, COALESCE_MS);
}

export function dispatchWsMessage(msg: ServerMessage) {
  if (msg.type === 'tick') {
    pending.set(msg.pair, msg);
    schedule();
  } else if (msg.type === 'snapshot') {
    for (const t of msg.pairs) pending.set(t.pair, t);
    schedule();
  }
}

// Test-only: drain pending ticks synchronously.
export function __flushCoalescedForTest() {
  if (scheduled) {
    clearTimeout(scheduled);
    scheduled = null;
  }
  flush();
}
