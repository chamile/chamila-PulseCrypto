import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { ClientMessageSchema, type ServerMessage } from '@pulsecrypto/contracts';
import type { MarketState } from './state.js';
import type { Metrics } from './metrics.js';
import { config } from './config.js';
import { log } from './logger.js';

class ConnectedClient {
  private timer: NodeJS.Timeout | null = null;
  private strikes = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private alive = true;
  private intervalMs: number;

  constructor(
    public readonly ws: WebSocket,
    private readonly state: MarketState,
    private readonly metrics: Metrics,
    initialIntervalMs: number,
    private readonly onClose: (c: ConnectedClient) => void,
  ) {
    this.intervalMs = initialIntervalMs;

    ws.on('message', (raw: Buffer) => this.handleMessage(raw));
    ws.on('pong', () => {
      this.alive = true;
    });
    ws.on('close', () => this.dispose());
    ws.on('error', (err) => {
      log.warn('client ws error', { err: String(err) });
      this.dispose();
    });

    this.sendInitialSnapshot();
    this.startEmitLoop();
    this.startHeartbeat();
  }

  currentInterval() {
    return this.intervalMs;
  }

  private sendInitialSnapshot() {
    const pairs = this.state.allTicks();
    if (pairs.length > 0) {
      this.send({ type: 'snapshot', pairs });
    }
  }

  private startEmitLoop() {
    this.stopEmitLoop();
    this.timer = setInterval(() => {
      for (const tick of this.state.allTicks()) {
        this.send(tick);
      }
    }, this.intervalMs);
    this.timer.unref();
  }

  private stopEmitLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startHeartbeat() {
    this.pingTimer = setInterval(() => {
      if (!this.alive) {
        log.warn('client heartbeat failed, terminating');
        this.ws.terminate();
        return;
      }
      this.alive = false;
      try {
        this.ws.ping();
      } catch {
        this.ws.terminate();
      }
    }, config.pingIntervalMs);
    this.pingTimer.unref();
  }

  private send(msg: ServerMessage) {
    if (this.ws.readyState !== WebSocket.OPEN) return;

    this.metrics.sampleBuffered(this.ws.bufferedAmount);

    if (this.ws.bufferedAmount > config.maxBufferedBytes) {
      this.strikes++;
      this.metrics.onDrop();
      if (this.strikes > config.maxStrikes) {
        log.warn('slow consumer disconnected', { strikes: this.strikes });
        this.ws.close(1013, 'slow consumer');
      }
      return;
    }
    this.strikes = 0;
    this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(raw: Buffer) {
    try {
      const parsed = ClientMessageSchema.safeParse(JSON.parse(raw.toString()));
      if (!parsed.success) {
        log.warn('client sent invalid message', {
          err: parsed.error.message,
        });
        return;
      }
      const msg = parsed.data;
      if (msg.type === 'setInterval') {
        log.info('client changed interval', { ms: msg.ms });
        this.intervalMs = msg.ms;
        this.startEmitLoop();
      }
    } catch (err) {
      log.warn('client message parse error', { err: String(err) });
    }
  }

  dispose() {
    this.stopEmitLoop();
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.onClose(this);
  }
}

export class WsHub {
  private clients = new Set<ConnectedClient>();

  constructor(
    private readonly state: MarketState,
    private readonly metrics: Metrics,
  ) {}

  attach(httpServer: HttpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    wss.on('connection', (ws) => {
      log.info('client connected', { total: this.clients.size + 1 });
      const client = new ConnectedClient(
        ws,
        this.state,
        this.metrics,
        config.emitIntervalMs,
        (c) => {
          this.clients.delete(c);
          log.info('client disconnected', { total: this.clients.size });
        },
      );
      this.clients.add(client);
    });
  }

  clientCount() {
    return this.clients.size;
  }

  broadcastConnState(upstream: 'up' | 'down') {
    const msg = JSON.stringify({ type: 'conn', upstream });
    for (const c of this.clients) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg);
      }
    }
  }

  avgIntervalMs() {
    if (this.clients.size === 0) return config.emitIntervalMs;
    let sum = 0;
    for (const c of this.clients) sum += c.currentInterval();
    return Math.round(sum / this.clients.size);
  }
}
