import { useEffect } from 'react';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import { Colors } from '@/theme';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key || !isAuthenticated) return;
    router.replace('/(app)/(tabs)/feed');
  }, [isAuthenticated, rootNavigationState?.key, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.surface[0] },
        animation: 'slide_from_right',
      }}
    />
  );
}
