import type { FastifyInstance } from 'fastify';
import type {
  HealthResponse,
  PairsMetaResponse,
} from '@pulsecrypto/contracts';
import { config } from './config.js';
import type { Metrics } from './metrics.js';
import type { WsHub } from './wsServer.js';

const META: Record<string, { displayName: string }> = {
  BTCUSDT: { displayName: 'Bitcoin' },
  ETHUSDT: { displayName: 'Ethereum' },
  SOLUSDT: { displayName: 'Solana' },
  DOGEUSDT: { displayName: 'Dogecoin' },
  XRPUSDT: { displayName: 'Ripple' },
};

export function registerRoutes(
  app: FastifyInstance,
  ctx: {
    metrics: Metrics;
    hub: WsHub;
    upstream: () => 'up' | 'down' | 'connecting';
    liveMetaCache: () => Map<string, {
      high24h: number;
      low24h: number;
      volume24h: number;
    }>;
  },
) {
  app.get('/pairs/meta', async (): Promise<PairsMetaResponse> => {
    const cache = ctx.liveMetaCache();
    return {
      pairs: config.pairs.map((p) => {
        const live = cache.get(p);
        return {
          pair: p,
          displayName: META[p]?.displayName ?? p,
          status: 'TRADING' as const,
          high24h: live?.high24h ?? 0,
          low24h: live?.low24h ?? 0,
          volume24h: live?.volume24h ?? 0,
        };
      }),
      serverTime: Date.now(),
    };
  });

  app.get('/health', async (): Promise<HealthResponse> => {
    const snap = ctx.metrics.snapshot();
    return {
      upstream: ctx.upstream(),
      clients: ctx.hub.clientCount(),
      emitIntervalMs: ctx.hub.avgIntervalMs(),
      ...snap,
    };
  });
}
