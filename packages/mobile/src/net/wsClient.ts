import { AppState, type AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import {
  ServerMessageSchema,
  type ServerMessage,
  type SetIntervalMsg,
} from '@pulsecrypto/contracts';
import { SERVER } from './config';

export type WsState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'offline';

type StateListener = (s: WsState) => void;
type MessageListener = (m: ServerMessage) => void;

const DEFAULT_INTERVAL_MS = 100;
const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_MAX_ATTEMPT = 6;
const RECONNECT_JITTER_MS = 500;
const NET_POLL_MS = 3000;

class WsClient {
  private ws: WebSocket | null = null;
  private state: WsState = 'idle';
  private stateListeners = new Set<StateListener>();
  private messageListeners = new Set<MessageListener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private appStateSub: { remove: () => void } | null = null;
  private netPoller: ReturnType<typeof setInterval> | null = null;
  private lastNetOnline = true;
  private lastInterval = DEFAULT_INTERVAL_MS;

  start() {
    this.stopped = false;
    this.attachLifecycle();
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearReconnect();
    this.detachLifecycle();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('idle');
  }

  onState(fn: StateListener) {
    this.stateListeners.add(fn);
    fn(this.state);
    return () => this.stateListeners.delete(fn);
  }

  onMessage(fn: MessageListener) {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  sendInterval(ms: number) {
    this.lastInterval = ms;
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: SetIntervalMsg = { type: 'setInterval', ms };
      this.ws.send(JSON.stringify(msg));
    }
  }

  currentState() {
    return this.state;
  }

  private setState(s: WsState) {
    if (this.state === s) return;
    this.state = s;
    for (const fn of this.stateListeners) fn(s);
  }

  private connect() {
    if (this.stopped) return;
    this.clearReconnect();

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(SERVER.ws);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState('open');
      if (this.lastInterval !== DEFAULT_INTERVAL_MS) {
        this.sendInterval(this.lastInterval);
      }
    };

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(String(ev.data));
        const parsed = ServerMessageSchema.safeParse(raw);
        if (!parsed.success) return;
        for (const fn of this.messageListeners) fn(parsed.data);
      } catch {
        // swallow
      }
    };

    ws.onerror = () => {
      // real handling happens in onclose
    };

    ws.onclose = () => {
      if (this.stopped) return;
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    this.reconnectAttempt++;
    const base = Math.min(
      BACKOFF_MAX_MS,
      BACKOFF_BASE_MS *
        2 ** Math.min(this.reconnectAttempt, BACKOFF_MAX_ATTEMPT),
    );
    const jitter = Math.random() * RECONNECT_JITTER_MS;
    const delay = base + jitter;
    this.setState('reconnecting');
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attachLifecycle() {
    this.appStateSub = AppState.addEventListener('change', (s) =>
      this.onAppState(s),
    );
    // expo-network doesn't expose a subscription in Managed workflow, so we poll.
    this.netPoller = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = !!state.isInternetReachable || !!state.isConnected;
        if (online !== this.lastNetOnline) {
          this.lastNetOnline = online;
          if (online) {
            this.reconnectAttempt = 0;
            this.connect();
          } else {
            this.setState('offline');
            this.ws?.close();
          }
        }
      } catch {
        // ignore
      }
    }, NET_POLL_MS);
  }

  private detachLifecycle() {
    this.appStateSub?.remove();
    this.appStateSub = null;
    if (this.netPoller) {
      clearInterval(this.netPoller);
      this.netPoller = null;
    }
  }

  private onAppState(s: AppStateStatus) {
    if (s === 'active') {
      if (this.state !== 'open' && this.state !== 'connecting') {
        this.reconnectAttempt = 0;
        this.connect();
      }
    } else if (s === 'background' || s === 'inactive') {
      this.ws?.close();
    }
  }
}

export const wsClient = new WsClient();
