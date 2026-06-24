import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenStorage } from '@/api';

// ── User type ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  uid: string;
  display_name: string;
  handle: string;
  photo_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  preferences: {
    vibes: string[];
    categories: string[];
    distance_km: number;
    price_range: [number, number];
  };
  stat_saves: number;
  stat_posts: number;
  stat_following: number;
  onboarding_done: boolean;
  is_verified: boolean;
  is_active: boolean;
  auth_provider?: string;
}

// ── Auth store ────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  unreadCount: number;
  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  setUnreadCount: (n: number) => void;
  decrementUnread: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      unreadCount: 0,
      setAuth: async (user, access, refresh) => {
        await TokenStorage.set('accessToken', access);
        await TokenStorage.set('refreshToken', refresh);
        set({ user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: async () => {
        await TokenStorage.delete('accessToken');
        await TokenStorage.delete('refreshToken');
        set({ user: null, isAuthenticated: false, unreadCount: 0 });
      },
      setUnreadCount: (n) => set({ unreadCount: n }),
      decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
    }),
    {
      name: 'nearme-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);

// ── Feed / filter store ───────────────────────────────────────────────────────
interface FeedState {
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  selectedVibes: string[];
  selectedCategories: string[];
  priceRange: [number, number];
  setLocation: (lat: number, lng: number) => void;
  setRadius: (km: number) => void;
  toggleVibe: (v: string) => void;
  toggleCategory: (c: string) => void;
  setPriceRange: (r: [number, number]) => void;
  resetFilters: () => void;
}

export const useFeedStore = create<FeedState>()((set) => ({
  lat: null, lng: null, radiusKm: 5,
  selectedVibes: [], selectedCategories: [], priceRange: [0, 4],
  setLocation: (lat, lng) => set({ lat, lng }),
  setRadius: (km) => set({ radiusKm: km }),
  toggleVibe: (v) => set((s) => ({
    selectedVibes: s.selectedVibes.includes(v)
      ? s.selectedVibes.filter(x => x !== v)
      : [...s.selectedVibes, v],
  })),
  toggleCategory: (c) => set((s) => ({
    selectedCategories: s.selectedCategories.includes(c)
      ? s.selectedCategories.filter(x => x !== c)
      : [...s.selectedCategories, c],
  })),
  setPriceRange: (r) => set({ priceRange: r }),
  resetFilters: () => set({ selectedVibes: [], selectedCategories: [], priceRange: [0, 4], radiusKm: 5 }),
}));
