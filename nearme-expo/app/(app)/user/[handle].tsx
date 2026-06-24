import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usersApi } from '@/api';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Card, Badge, Avatar, StatRow, EmptyState, Skeleton } from '@/components/ui';
import { ChevronLeft, User } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', handle],
    queryFn: () => usersApi.getProfile(handle),
  });

  const user = data?.data?.data as Record<string, unknown> | null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing[5] }}>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
            <Skeleton width={80} height={80} borderRadius={40} />
            <View style={{ flex: 1, gap: 10 }}>
              <Skeleton height={22} width="60%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={20} width={80} borderRadius={Radius.full} />
            </View>
          </View>
          <Skeleton height={72} />
        </View>
      ) : !user ? (
        <EmptyState icon={<User size={32} color={Colors.surface[500]} />} title="User not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card style={styles.avatarCard}>
              <Avatar
                uri={String(user.photo_url ?? '')}
                name={String(user.display_name ?? '?')}
                size={80}
              />
              <View style={{ flex: 1, marginLeft: Spacing[4] }}>
                <Text style={styles.displayName}>{String(user.display_name)}</Text>
                <Text style={styles.handle}>@{String(user.handle)}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Badge color={
                    String(user.role) === 'admin' ? Colors.brand[500] :
                    String(user.role) === 'moderator' ? Colors.info : Colors.surface[600]
                  }>
                    {String(user.role)}
                  </Badge>
                  <Text style={styles.joinDate}>
                    Joined {formatDistanceToNow(new Date(String(user.created_at)), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginTop: Spacing[4] }}>
            <StatRow items={[
              { label: 'Posts', value: Number(user.stat_posts ?? 0) },
              { label: 'Saves', value: Number(user.stat_saves ?? 0) },
              { label: 'Following', value: Number(user.stat_following ?? 0) },
            ]} />
          </Animated.View>

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  scroll: { paddingHorizontal: Spacing[5] },
  avatarCard: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing[2] },
  displayName: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  handle: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], marginTop: 2 },
  joinDate: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], alignSelf: 'center' },
});
