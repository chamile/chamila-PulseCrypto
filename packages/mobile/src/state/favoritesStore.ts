import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'pulsecrypto:favorites:v1';

interface FavoritesState {
  favorites: string[];
  hydrated: boolean;
  toggle: (pair: string) => void;
  isFavorite: (pair: string) => boolean;
  hydrate: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  hydrated: false,

  toggle: (pair) => {
    const cur = get().favorites;
    const next = cur.includes(pair)
      ? cur.filter((p) => p !== pair)
      : [...cur, pair];
    set({ favorites: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },

  isFavorite: (pair) => get().favorites.includes(pair),

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        set({ favorites: arr, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
