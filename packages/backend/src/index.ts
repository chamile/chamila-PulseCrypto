import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { log } from './logger.js';
import { Metrics } from './metrics.js';
import { MarketState } from './state.js';
import { BinanceClient } from './binanceClient.js';
import { WsHub } from './wsServer.js';
import { registerRoutes } from './routes.js';

async function main() {
  const metrics = new Metrics();
  const state = new MarketState(config.pairs);
  const binance = new BinanceClient(
    config.binanceStreamUrl,
    config.pairs,
    config.depthLevels,
    state,
    metrics,
  );

  let upstream: 'up' | 'down' | 'connecting' = 'connecting';
  const hub = new WsHub(state, metrics);
  binance.onUpstreamChange((up) => {
    upstream = up ? 'up' : 'down';
    hub.broadcastConnState(up ? 'up' : 'down');
  });

  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  registerRoutes(app, {
    metrics,
    hub,
    upstream: () => upstream,
    liveMetaCache: () => {
      const map = new Map<
        string,
        { high24h: number; low24h: number; volume24h: number }
      >();
      for (const t of state.allTicks()) {
        map.set(t.pair, {
          high24h: t.high24h,
          low24h: t.low24h,
          volume24h: t.volume24h,
        });
      }
      return map;
    },
  });

  await app.listen({ host: config.host, port: config.port });
  log.info('http listening', { host: config.host, port: config.port });

  hub.attach(app.server);
  log.info('ws attached at /ws');

  binance.start();

  const shutdown = async (signal: string) => {
    log.info('shutting down', { signal });
    binance.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  log.error('fatal', { err: String(err) });
  process.exit(1);
});
