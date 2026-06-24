import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';
import { useAuthStore } from '@/store';
import { safeHaptics } from '@/utils/haptics';
import {
  Compass, Bookmark, Bell, User, Search,
} from 'lucide-react-native';

const TABS = [
  { name: 'feed',          label: 'Discover',  icon: Compass },
  { name: 'search',        label: 'Search',    icon: Search },
  { name: 'saves',         label: 'Saved',     icon: Bookmark },
  { name: 'notifications', label: 'Inbox',     icon: Bell },
  { name: 'profile',       label: 'Me',        icon: User },
];

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useAuthStore();

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, i: number) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const Tab = TABS[i];
          if (!Tab) return null;
          const Icon = Tab.icon;
          const scale = useSharedValue(1);

          const animStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));

          const onPress = () => {
            if (!focused) {
              scale.value = withSpring(0.85, { damping: 10 }, () => {
                scale.value = withSpring(1, { damping: 10 });
              });
              safeHaptics.selection();
              navigation.navigate(route.name);
            }
          };

          const showBadge = Tab.name === 'notifications' && unreadCount > 0;

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <Animated.View style={[styles.tabContent, animStyle]}>
                <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                  <Icon
                    size={22}
                    color={focused ? Colors.brand[400] : Colors.surface[600]}
                    strokeWidth={focused ? 2.5 : 1.8}
                  />
                  {showBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {Tab.label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="saves" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: `${Colors.surface[50]}E0`,
    borderTopWidth: 1, borderTopColor: Colors.surface[200],
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row', paddingTop: Spacing[2],
  },
  tab: { flex: 1, alignItems: 'center' },
  tabContent: { alignItems: 'center', paddingVertical: 4 },
  tabIcon: {
    width: 44, height: 36, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  tabIconActive: { backgroundColor: `${Colors.brand[500]}18` },
  tabLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: 10, color: Colors.surface[600], marginTop: 2,
  },
  tabLabelActive: { color: Colors.brand[400], fontFamily: Typography.families.bodySemiBold },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: Colors.surface[50],
  },
  badgeText: { fontFamily: Typography.families.displayMedium, fontSize: 9, color: '#fff' },
});
