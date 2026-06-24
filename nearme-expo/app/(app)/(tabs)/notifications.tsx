import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import { useAuthStore } from '@/store';
import { useToast, useRefreshControl } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { EmptyState, Button, Skeleton } from '@/components/ui';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Notification } from '@/types';
import { Bell, CheckCheck, Trash2 } from 'lucide-react-native';

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const { setUnreadCount, decrementUnread } = useAuthStore();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationsApi.getAll({ page, limit: 20, unread_only: unreadOnly }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setUnreadCount(data?.data?.data?.unread_count ?? 0);
  }, [data, setUnreadCount]);

  const { refreshing, onRefresh } = useRefreshControl(async () => { await refetch(); });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setUnreadCount(0); toast.success('All marked as read'); },
  });

  const markOneMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); decrementUnread(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Deleted'); },
  });

  const clearAllMut = useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setUnreadCount(0); toast.success('All notifications cleared'); },
  });

  const notifs: Notification[] = data?.data?.data?.notifications ?? [];
  const total: number = data?.data?.data?.total ?? 0;
  const unreadCount: number = data?.data?.data?.unread_count ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up ✓'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable onPress={() => markAllMut.mutate()} style={styles.headerBtn}>
              <CheckCheck size={17} color={Colors.success} />
            </Pressable>
          )}
          <Pressable onPress={() => clearAllMut.mutate()} style={styles.headerBtn}>
            <Trash2 size={17} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {[false, true].map((v) => (
          <Pressable
            key={String(v)}
            onPress={() => { setUnreadOnly(v); setPage(1); }}
            style={[styles.filterBtn, unreadOnly === v && styles.filterBtnActive]}
          >
            <Text style={[styles.filterBtnText, unreadOnly === v && styles.filterBtnTextActive]}>
              {v ? `Unread (${unreadCount})` : 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={12} width="50%" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand[500]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={32} color={Colors.surface[500]} />}
              title={unreadOnly ? 'No unread notifications' : 'No notifications'}
              description="You're all caught up!"
            />
          }
          renderItem={({ item }) => (
            <NotificationItem
              notif={item}
              onMarkRead={(id) => markOneMut.mutate(id)}
              onDelete={(id) => deleteMut.mutate(id)}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  subtitle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: Radius.full, backgroundColor: Colors.surface[150],
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  filterBtnActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  filterBtnText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  filterBtnTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing[4] },
});
