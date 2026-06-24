import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { useFeedStore } from '@/store';
import { safeHaptics } from '@/utils/haptics';

// ── useLocation ────────────────────────────────────────────────────────────────
export function useLocation() {
  const { lat, lng, setLocation } = useFeedStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      setError('Could not get location');
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  return { lat, lng, loading, error, requestLocation };
}

// ── useDebounce ────────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── useRefreshControl ─────────────────────────────────────────────────────────
export function useRefreshControl(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await safeHaptics.impactLight();
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);
  return { refreshing, onRefresh: refresh };
}

// ── useToast ───────────────────────────────────────────────────────────────────
export function useToast() {
  return {
    success: (msg: string) => {
      safeHaptics.success();
      Toast.show({ type: 'success', text1: msg, visibilityTime: 2500 });
    },
    error: (msg: string) => {
      safeHaptics.error();
      Toast.show({ type: 'error', text1: msg, visibilityTime: 3000 });
    },
    info: (msg: string) => Toast.show({ type: 'info', text1: msg, visibilityTime: 2500 }),
  };
}

// ── usePagination ─────────────────────────────────────────────────────────────
export function usePagination(limit = 20) {
  const [page, setPage] = useState(1);
  const reset = useCallback(() => setPage(1), []);
  const next = useCallback(() => setPage(p => p + 1), []);
  return { page, limit, next, reset };
}

// ── useApiError ───────────────────────────────────────────────────────────────
export function extractApiError(err: unknown): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}
