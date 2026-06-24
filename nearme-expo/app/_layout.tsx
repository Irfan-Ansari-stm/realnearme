import React, { useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  Syne_400Regular,
  Syne_500Medium,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Custom toast config
const toastConfig = {
  success: ({ text1 }: { text1?: string }) => (
    <View style={{
      marginHorizontal: 16, padding: 14, borderRadius: 16,
      backgroundColor: '#181818', borderWidth: 1, borderColor: `${Colors.success}40`,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <View style={{ marginRight: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ fontFamily: 'DMSans_500Medium' } as any} />
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ paddingRight: 4, fontFamily: 'DMSans_500Medium', color: Colors.surface[900] }}>
                {text1}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  ),
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_400Regular, Syne_500Medium: Syne_500Medium as any,
    Syne_600SemiBold, Syne_700Bold, Syne_800ExtraBold,
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold: DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.surface[0] }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.surface[0]} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.surface[0] },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)"  options={{ headerShown: false }} />
          </Stack>
          <Toast
            config={toastConfig}
            position="bottom"
            bottomOffset={100}
          />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
