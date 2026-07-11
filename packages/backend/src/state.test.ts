import { describe, it, expect } from 'vitest';
import { MarketState } from './state.js';
import { MarketTickSchema } from '@pulsecrypto/contracts';

describe('MarketState — coalesce', () => {
  it('overwrites the pair snapshot on every applyDepth (last-wins)', () => {
    const state = new MarketState(['BTCUSDT']);

    for (let i = 0; i < 100; i++) {
      state.applyDepth(
        'BTCUSDT',
        [{ price: 100 + i, qty: 1 }],
        [{ price: 200 + i, qty: 1 }],
      );
    }
    state.applyTicker('BTCUSDT', 199.5, 1.0, 200, 100, 1000);

    const tick = state.buildTick('BTCUSDT');
    expect(tick).not.toBeNull();
    expect(tick!.bids[0]!.price).toBe(199); // 100 + 99
    expect(tick!.asks[0]!.price).toBe(299); // 200 + 99
  });

  it('buildTick emits at most one snapshot per pair regardless of update count', () => {
    const state = new MarketState(['BTCUSDT', 'ETHUSDT']);

    for (let i = 0; i < 1000; i++) {
      state.applyDepth('BTCUSDT', [{ price: 100, qty: 1 }], [{ price: 101, qty: 1 }]);
      state.applyTicker('BTCUSDT', 100, 0, 105, 95, 1000);
    }

    const all = state.allTicks();
    const btc = all.filter((t) => t.pair === 'BTCUSDT');
    expect(btc.length).toBe(1);
  });

  it('produced tick passes the shared MarketTickSchema', () => {
    const state = new MarketState(['BTCUSDT']);
    state.applyDepth(
      'BTCUSDT',
      [
        { price: 100, qty: 5 },
        { price: 99, qty: 3 },
      ],
      [
        { price: 101, qty: 4 },
        { price: 102, qty: 2 },
      ],
    );
    state.applyTicker('BTCUSDT', 100.5, 1.5, 105, 95, 12345);

    const tick = state.buildTick('BTCUSDT');
    const result = MarketTickSchema.safeParse(tick);
    expect(result.success).toBe(true);
  });

  it('computes spread and pressure from top-of-book', () => {
    const state = new MarketState(['BTCUSDT']);
    state.applyDepth(
      'BTCUSDT',
      [{ price: 100, qty: 8 }],
      [{ price: 101, qty: 2 }],
    );
    state.applyTicker('BTCUSDT', 100, 0, 105, 95, 1000);

    const tick = state.buildTick('BTCUSDT')!;
    expect(tick.spread).toBeCloseTo(1, 4);
    // 8 bids vs 2 asks → 80% buy pressure
    expect(tick.buyPressure).toBeCloseTo(80, 1);
    expect(tick.sellPressure).toBeCloseTo(20, 1);
  });

  it('returns null when book is empty (no false snapshot)', () => {
    const state = new MarketState(['BTCUSDT']);
    expect(state.buildTick('BTCUSDT')).toBeNull();
    expect(state.allTicks()).toEqual([]);
  });
});
