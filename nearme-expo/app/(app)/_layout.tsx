import { useEffect } from 'react';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import { Colors } from '@/theme';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key || isAuthenticated) return;
    router.replace('/(auth)/login');
  }, [isAuthenticated, rootNavigationState?.key, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.surface[0] },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="place/[placeId]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="post/[postId]" options={{ presentation: 'card' }} />
      <Stack.Screen name="user/[handle]" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/users" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/reports" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/audit" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/algorithm" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/jobs" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/sessions" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/moderation" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/places" options={{ presentation: 'card' }} />
    </Stack>
  );
}
