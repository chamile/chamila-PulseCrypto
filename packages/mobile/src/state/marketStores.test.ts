import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPairStore,
  dispatchWsMessage,
  __flushCoalescedForTest,
} from './marketStores';
import type { MarketTick } from '@pulsecrypto/contracts';

function tick(overrides: Partial<MarketTick> = {}): MarketTick {
  return {
    type: 'tick',
    pair: 'BTCUSDT',
    price: 100,
    change24hPct: 0,
    high24h: 101,
    low24h: 99,
    volume24h: 1000,
    spread: 1,
    buyPressure: 50,
    sellPressure: 50,
    bids: [{ price: 99.5, qty: 1 }],
    asks: [{ price: 100.5, qty: 1 }],
    ts: Date.now(),
    ...overrides,
  };
}

describe('pair store reducer', () => {
  beforeEach(() => {
    getPairStore('BTCUSDT').setState({
      tick: null,
      prevPrice: null,
      lastFlash: null,
    });
  });

  it('records the first tick without flashing', () => {
    getPairStore('BTCUSDT').getState().update(tick({ price: 100 }));
    const s = getPairStore('BTCUSDT').getState();
    expect(s.tick?.price).toBe(100);
    expect(s.prevPrice).toBeNull();
    expect(s.lastFlash).toBeNull();
  });

  it('flashes up when the new price exceeds the previous', () => {
    const store = getPairStore('BTCUSDT');
    store.getState().update(tick({ price: 100 }));
    store.getState().update(tick({ price: 101 }));
    expect(store.getState().lastFlash).toBe('up');
    expect(store.getState().prevPrice).toBe(100);
  });

  it('flashes down when the new price falls below the previous', () => {
    const store = getPairStore('BTCUSDT');
    store.getState().update(tick({ price: 100 }));
    store.getState().update(tick({ price: 99 }));
    expect(store.getState().lastFlash).toBe('down');
  });

  it('leaves lastFlash unchanged when the price is identical', () => {
    const store = getPairStore('BTCUSDT');
    store.getState().update(tick({ price: 100 }));
    store.getState().update(tick({ price: 101 })); // sets up
    store.getState().update(tick({ price: 101 })); // no change → keep 'up'
    expect(store.getState().lastFlash).toBe('up');
  });
});

describe('dispatchWsMessage', () => {
  beforeEach(() => {
    getPairStore('BTCUSDT').setState({
      tick: null,
      prevPrice: null,
      lastFlash: null,
    });
    getPairStore('ETHUSDT').setState({
      tick: null,
      prevPrice: null,
      lastFlash: null,
    });
  });

  it('routes a tick message to the correct pair store', () => {
    dispatchWsMessage(tick({ pair: 'BTCUSDT', price: 65_000 }));
    __flushCoalescedForTest();
    expect(getPairStore('BTCUSDT').getState().tick?.price).toBe(65_000);
    expect(getPairStore('ETHUSDT').getState().tick).toBeNull();
  });

  it('fans out a snapshot to all pairs in one message', () => {
    dispatchWsMessage({
      type: 'snapshot',
      pairs: [
        tick({ pair: 'BTCUSDT', price: 65_000 }),
        tick({ pair: 'ETHUSDT', price: 3_200 }),
      ],
    });
    __flushCoalescedForTest();
    expect(getPairStore('BTCUSDT').getState().tick?.price).toBe(65_000);
    expect(getPairStore('ETHUSDT').getState().tick?.price).toBe(3_200);
  });

  it('coalesces bursts — only the latest tick per pair reaches the store', () => {
    dispatchWsMessage(tick({ pair: 'BTCUSDT', price: 100 }));
    dispatchWsMessage(tick({ pair: 'BTCUSDT', price: 101 }));
    dispatchWsMessage(tick({ pair: 'BTCUSDT', price: 102 }));
    __flushCoalescedForTest();
    const s = getPairStore('BTCUSDT').getState();
    expect(s.tick?.price).toBe(102);
    // Only one update fired, so prevPrice is null (first store write)
    expect(s.prevPrice).toBeNull();
  });
});
