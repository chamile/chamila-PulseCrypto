import { create } from 'zustand';
import type { PairMeta } from '@pulsecrypto/contracts';
import { fetchPairsMeta } from '@/net/restClient';
import { toNetError, type NetError } from '@/net/errors';

interface MetaState {
  byPair: Record<string, PairMeta>;
  loading: boolean;
  error: NetError | null;
  lastLoadedAt: number | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useMetaStore = create<MetaState>((set) => ({
  byPair: {},
  loading: false,
  error: null,
  lastLoadedAt: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const resp = await fetchPairsMeta();
      const byPair: Record<string, PairMeta> = {};
      for (const p of resp.pairs) byPair[p.pair] = p;
      set({ byPair, loading: false, lastLoadedAt: Date.now() });
    } catch (err) {
      set({ loading: false, error: toNetError(err) });
    }
  },

  clearError: () => set({ error: null }),
}));
