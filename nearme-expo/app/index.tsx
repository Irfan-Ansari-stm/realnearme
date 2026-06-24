import { useEffect } from 'react';
import { View } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuthStore } from '@/store';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    router.replace(isAuthenticated ? '/(app)/(tabs)/feed' : '/(auth)/login');
  }, [isAuthenticated, rootNavigationState?.key, router]);

  return <View />;
}
