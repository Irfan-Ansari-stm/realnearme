import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTokens, clearTokens } from '@/lib/api';

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

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  unreadCount: number;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      unreadCount: 0,
      setAuth: (user, accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        clearTokens();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, unreadCount: 0 });
      },
      setUnreadCount: (count) => set({ unreadCount: count }),
      decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
    }),
    {
      name: 'nearme-auth',
      partialize: (state: AuthStore) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Feed & location store
interface FeedStore {
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  selectedVibes: string[];
  selectedCategories: string[];
  priceRange: [number, number];
  setLocation: (lat: number, lng: number) => void;
  setRadius: (km: number) => void;
  toggleVibe: (vibe: string) => void;
  toggleCategory: (cat: string) => void;
  setPriceRange: (range: [number, number]) => void;
  resetFilters: () => void;
}

export const useFeedStore = create<FeedStore>()((set) => ({
  lat: null,
  lng: null,
  radiusKm: 5,
  selectedVibes: [],
  selectedCategories: [],
  priceRange: [0, 4],
  setLocation: (lat, lng) => set({ lat, lng }),
  setRadius: (km) => set({ radiusKm: km }),
  toggleVibe: (vibe) => set((s) => ({
    selectedVibes: s.selectedVibes.includes(vibe)
      ? s.selectedVibes.filter((v) => v !== vibe)
      : [...s.selectedVibes, vibe],
  })),
  toggleCategory: (cat) => set((s) => ({
    selectedCategories: s.selectedCategories.includes(cat)
      ? s.selectedCategories.filter((c) => c !== cat)
      : [...s.selectedCategories, cat],
  })),
  setPriceRange: (range) => set({ priceRange: range }),
  resetFilters: () => set({ selectedVibes: [], selectedCategories: [], priceRange: [0, 4], radiusKm: 5 }),
}));
