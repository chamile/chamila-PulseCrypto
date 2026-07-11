import WebSocket from 'ws';
import type { MarketState } from './state.js';
import type { Metrics } from './metrics.js';
import { log } from './logger.js';

interface RawDepthMsg {
  bids: [string, string][];
  asks: [string, string][];
}

interface RawTickerMsg {
  c: string;
  P: string;
  h: string;
  l: string;
  v: string;
}

interface CombinedMsg {
  stream: string;
  data: RawDepthMsg | RawTickerMsg;
}

export class BinanceClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private closed = false;
  private connectedListeners: Array<(up: boolean) => void> = [];

  constructor(
    private readonly baseUrl: string,
    private readonly pairs: readonly string[],
    private readonly depthLevels: number,
    private readonly state: MarketState,
    private readonly metrics: Metrics,
  ) {}

  onUpstreamChange(fn: (up: boolean) => void) {
    this.connectedListeners.push(fn);
  }

  private emitConn(up: boolean) {
    for (const fn of this.connectedListeners) fn(up);
  }

  start() {
    this.closed = false;
    this.connect();
  }

  stop() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }

  private buildUrl(): string {
    const streams = this.pairs.flatMap((p) => {
      const lc = p.toLowerCase();
      return [`${lc}@depth${this.depthLevels}@100ms`, `${lc}@ticker`];
    });
    return `${this.baseUrl}?streams=${streams.join('/')}`;
  }

  private connect() {
    if (this.closed) return;
    const url = this.buildUrl();
    log.info('binance: connecting', { url });
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on('open', () => {
      log.info('binance: open');
      this.reconnectAttempt = 0;
      this.emitConn(true);
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as CombinedMsg;
        this.handle(msg);
        this.metrics.onUpstreamMsg();
      } catch (err) {
        log.warn('binance: parse error', { err: String(err) });
      }
    });

    ws.on('close', () => {
      log.warn('binance: closed');
      this.emitConn(false);
      this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      log.warn('binance: error', { err: String(err) });
    });

    ws.on('ping', () => ws.pong());
  }

  private handle(msg: CombinedMsg) {
    const [pairLc, streamType] = msg.stream.split('@');
    if (!pairLc) return;
    const pair = pairLc.toUpperCase();

    if (streamType?.startsWith('depth')) {
      const d = msg.data as RawDepthMsg;
      const bids = d.bids.map((b) => ({
        price: parseFloat(b[0]),
        qty: parseFloat(b[1]),
      }));
      const asks = d.asks.map((a) => ({
        price: parseFloat(a[0]),
        qty: parseFloat(a[1]),
      }));
      this.state.applyDepth(pair, bids, asks);
    } else if (streamType === 'ticker') {
      const t = msg.data as RawTickerMsg;
      this.state.applyTicker(
        pair,
        parseFloat(t.c),
        parseFloat(t.P),
        parseFloat(t.h),
        parseFloat(t.l),
        parseFloat(t.v),
      );
    }
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.reconnectAttempt++;
    const base = Math.min(30_000, 500 * 2 ** Math.min(this.reconnectAttempt, 6));
    const jitter = Math.random() * 500;
    const delay = base + jitter;
    log.info('binance: reconnect scheduled', {
      attempt: this.reconnectAttempt,
      delayMs: Math.round(delay),
    });
    setTimeout(() => this.connect(), delay);
  }
}
