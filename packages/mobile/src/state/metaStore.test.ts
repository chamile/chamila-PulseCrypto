import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/net/restClient', () => ({
  fetchPairsMeta: vi.fn(),
}));

import { useMetaStore } from './metaStore';
import { fetchPairsMeta } from '@/net/restClient';
import { httpError } from '@/net/errors';

const mockedFetch = fetchPairsMeta as unknown as ReturnType<typeof vi.fn>;

describe('metaStore.refresh', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    useMetaStore.setState({
      byPair: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
  });

  it('populates byPair on success and clears error', async () => {
    mockedFetch.mockResolvedValue({
      pairs: [
        {
          pair: 'BTCUSDT',
          displayName: 'Bitcoin',
          base: 'BTC',
          quote: 'USDT',
          pricePrecision: 2,
          qtyPrecision: 6,
        },
      ],
    });

    await useMetaStore.getState().refresh();

    const s = useMetaStore.getState();
    expect(s.byPair.BTCUSDT?.displayName).toBe('Bitcoin');
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.lastLoadedAt).not.toBeNull();
  });

  it('stores a typed NetError on failure and stops loading', async () => {
    mockedFetch.mockRejectedValue(httpError(503));

    await useMetaStore.getState().refresh();

    const s = useMetaStore.getState();
    expect(s.error).not.toBeNull();
    expect(s.error?.kind).toBe('http');
    expect(s.error?.status).toBe(503);
    expect(s.error?.retryable).toBe(true);
    expect(s.loading).toBe(false);
  });

  it('classifies a raw TypeError (offline fetch) as a network error', async () => {
    mockedFetch.mockRejectedValue(new TypeError('Network request failed'));

    await useMetaStore.getState().refresh();

    expect(useMetaStore.getState().error?.kind).toBe('network');
  });

  it('clearError resets the error to null', async () => {
    mockedFetch.mockRejectedValue(httpError(500));
    await useMetaStore.getState().refresh();
    expect(useMetaStore.getState().error).not.toBeNull();

    useMetaStore.getState().clearError();
    expect(useMetaStore.getState().error).toBeNull();
  });
});
