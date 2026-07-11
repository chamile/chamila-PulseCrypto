import { create } from 'zustand';

interface SelectedPairState {
  pair: string;
  select: (p: string) => void;
}

export const useSelectedPair = create<SelectedPairState>((set) => ({
  pair: 'BTCUSDT',
  select: (pair) => set({ pair }),
}));
