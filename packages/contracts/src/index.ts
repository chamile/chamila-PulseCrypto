import { z } from 'zod';

export const SUPPORTED_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'DOGEUSDT',
  'XRPUSDT',
] as const;
export type Pair = (typeof SUPPORTED_PAIRS)[number];

export const LevelSchema = z.object({
  price: z.number(),
  qty: z.number(),
});
export type Level = z.infer<typeof LevelSchema>;

export const MarketTickSchema = z.object({
  type: z.literal('tick'),
  pair: z.string(),
  ts: z.number(),
  price: z.number(),
  change24hPct: z.number(),
  high24h: z.number(),
  low24h: z.number(),
  volume24h: z.number(),
  spread: z.number(),
  buyPressure: z.number(),
  sellPressure: z.number(),
  bids: z.array(LevelSchema),
  asks: z.array(LevelSchema),
});
export type MarketTick = z.infer<typeof MarketTickSchema>;

export const SnapshotSchema = z.object({
  type: z.literal('snapshot'),
  pairs: z.array(MarketTickSchema),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ConnStateSchema = z.object({
  type: z.literal('conn'),
  upstream: z.enum(['up', 'down']),
});
export type ConnState = z.infer<typeof ConnStateSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
  MarketTickSchema,
  SnapshotSchema,
  ConnStateSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export const SetIntervalMsgSchema = z.object({
  type: z.literal('setInterval'),
  ms: z.number().int().min(10).max(2000),
});
export type SetIntervalMsg = z.infer<typeof SetIntervalMsgSchema>;

export const ClientMessageSchema = z.discriminatedUnion('type', [
  SetIntervalMsgSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const PairMetaSchema = z.object({
  pair: z.string(),
  displayName: z.string(),
  status: z.enum(['TRADING', 'HALTED']),
  high24h: z.number(),
  low24h: z.number(),
  volume24h: z.number(),
});
export type PairMeta = z.infer<typeof PairMetaSchema>;

export const PairsMetaResponseSchema = z.object({
  pairs: z.array(PairMetaSchema),
  serverTime: z.number(),
});
export type PairsMetaResponse = z.infer<typeof PairsMetaResponseSchema>;

export const HealthResponseSchema = z.object({
  upstream: z.enum(['up', 'down', 'connecting']),
  clients: z.number(),
  msgsPerSec: z.number(),
  avgBufferedBytes: z.number(),
  drops: z.number(),
  uptimeSec: z.number(),
  memoryMb: z.number(),
  emitIntervalMs: z.number(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
