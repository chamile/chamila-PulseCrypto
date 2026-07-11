import type { Level, MarketTick } from '@pulsecrypto/contracts';

interface PairState {
  pair: string;
  bids: Level[];
  asks: Level[];
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: number;
}

export class MarketState {
  private state = new Map<string, PairState>();

  constructor(pairs: readonly string[]) {
    for (const p of pairs) {
      this.state.set(p, {
        pair: p,
        bids: [],
        asks: [],
        price: 0,
        change24hPct: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        updatedAt: 0,
      });
    }
  }

  applyDepth(pair: string, bids: Level[], asks: Level[]) {
    const s = this.state.get(pair);
    if (!s) return;
    s.bids = bids;
    s.asks = asks;
    s.updatedAt = Date.now();
  }

  applyTicker(
    pair: string,
    price: number,
    change24hPct: number,
    high24h: number,
    low24h: number,
    volume24h: number,
  ) {
    const s = this.state.get(pair);
    if (!s) return;
    s.price = price;
    s.change24hPct = change24hPct;
    s.high24h = high24h;
    s.low24h = low24h;
    s.volume24h = volume24h;
    s.updatedAt = Date.now();
  }

  buildTick(pair: string): MarketTick | null {
    const s = this.state.get(pair);
    if (!s || s.bids.length === 0 || s.asks.length === 0) return null;

    const bestBid = s.bids[0]!.price;
    const bestAsk = s.asks[0]!.price;
    const spread = bestAsk - bestBid;

    let bidVol = 0;
    let askVol = 0;
    for (const l of s.bids) bidVol += l.qty;
    for (const l of s.asks) askVol += l.qty;
    const total = bidVol + askVol;
    const buyPressure = total > 0 ? (bidVol / total) * 100 : 50;
    const sellPressure = 100 - buyPressure;

    return {
      type: 'tick',
      pair,
      ts: Date.now(),
      price: s.price || bestBid,
      change24hPct: s.change24hPct,
      high24h: s.high24h,
      low24h: s.low24h,
      volume24h: s.volume24h,
      spread: round(spread, 4),
      buyPressure: round(buyPressure, 2),
      sellPressure: round(sellPressure, 2),
      bids: s.bids,
      asks: s.asks,
    };
  }

  allTicks(): MarketTick[] {
    const out: MarketTick[] = [];
    for (const p of this.state.keys()) {
      const t = this.buildTick(p);
      if (t) out.push(t);
    }
    return out;
  }
}

const round = (n: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
