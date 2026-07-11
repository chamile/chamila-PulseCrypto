import { SUPPORTED_PAIRS } from '@pulsecrypto/contracts';

const num = (key: string, fallback: number): number => {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: num('PORT', 8080),
  emitIntervalMs: num('EMIT_INTERVAL_MS', 100),
  maxBufferedBytes: num('MAX_BUFFERED_BYTES', 1_000_000),
  maxStrikes: num('MAX_STRIKES', 10),
  pingIntervalMs: num('PING_INTERVAL_MS', 15_000),
  binanceStreamUrl:
    process.env.BINANCE_STREAM_URL ?? 'wss://stream.binance.com:9443/stream',
  pairs: SUPPORTED_PAIRS,
  depthLevels: num('DEPTH_LEVELS', 20),
} as const;

export type Config = typeof config;
