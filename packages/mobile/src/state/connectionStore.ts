import { create } from 'zustand';
import type { WsState } from '@/net/wsClient';

// Sub-2s reconnect flaps are invisible; longer drops surface as offline UI.
const OFFLINE_GRACE_MS = 2000;

interface ConnectionState {
  wsState: WsState;
  upstream: 'up' | 'down' | 'unknown';
  lastUpdatedAt: number | null;
  showOffline: boolean;
  offlineTimer: ReturnType<typeof setTimeout> | null;
  setWsState: (s: WsState) => void;
  setUpstream: (u: 'up' | 'down') => void;
  touch: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  wsState: 'idle',
  upstream: 'unknown',
  lastUpdatedAt: null,
  showOffline: false,
  offlineTimer: null,

  setWsState: (s) => {
    const prev = get();
    if (prev.offlineTimer) clearTimeout(prev.offlineTimer);

    if (s === 'open') {
      set({ wsState: s, showOffline: false, offlineTimer: null });
    } else {
      const timer = setTimeout(() => {
        set({ showOffline: true, offlineTimer: null });
      }, OFFLINE_GRACE_MS);
      set({ wsState: s, offlineTimer: timer });
    }
  },

  setUpstream: (u) => set({ upstream: u }),
  touch: () => set({ lastUpdatedAt: Date.now() }),
}));
