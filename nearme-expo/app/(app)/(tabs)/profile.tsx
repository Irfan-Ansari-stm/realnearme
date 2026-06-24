import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usersApi, sessionsApi, authApi } from '@/api';
import { useAuthStore } from '@/store';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';
import {
  Card, Button, Avatar, Badge, Divider, StatRow,
  Toggle, EmptyState, Skeleton, SheetModal,
} from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  User, FileText, Bookmark, Settings, Shield, LogOut,
  Smartphone, Trash2, Edit2, ChevronRight, AlertTriangle,
  Cpu, Lock,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { user, setUser, logout } = useAuthStore();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(user?.display_name ?? '');

  const { data: sessionsData } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: sessionsApi.getMySessions,
  });
  const sessions = sessionsData?.data?.data ?? [];

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.updateMe(data),
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Profile updated!');
      setShowEditSheet(false);
    },
    onError: () => toast.error('Failed to update'),
  });

  const revokeSessionMut = useMutation({
    mutationFn: (id: string) => sessionsApi.revokeOne(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-sessions'] }); toast.success('Session revoked'); },
  });

  const deletionMut = useMutation({
    mutationFn: () => usersApi.deleteMe(),
    onSuccess: (res) => {
      toast.success(`Deletion scheduled. Deadline: ${new Date(res.data.data.deadline).toLocaleDateString()}`);
      setShowDeleteConfirm(false);
    },
    onError: () => toast.error('Failed to request deletion'),
  });

  const handleLogout = async () => {
    try {
      const refresh = await require('@/api').TokenStorage.get('refreshToken');
      if (refresh) await authApi.logout(refresh);
    } catch {}
    await logout();
    toast.success('Signed out');
  };

  if (!user) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ flex: 1, padding: Spacing[4] }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} style={{ marginBottom: 12 }} />)}
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Pressable onPress={() => setShowEditSheet(true)} style={styles.editBtn}>
            <Edit2 size={17} color={Colors.surface[700]} />
          </Pressable>
        </View>

        {/* Avatar card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card style={styles.avatarCard}>
            <Avatar uri={user.photo_url} name={user.display_name} size={80} />
            <View style={{ flex: 1, marginLeft: Spacing[4] }}>
              <Text style={styles.displayName}>{user.display_name}</Text>
              <Text style={styles.handle}>@{user.handle}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Badge
                  color={user.role === 'admin' ? Colors.brand[500] : user.role === 'moderator' ? Colors.info : Colors.surface[600]}
                >
                  {user.role}
                </Badge>
                {user.is_verified && <Badge color={Colors.success}>✓ Verified</Badge>}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginTop: Spacing[4] }}>
          <StatRow items={[
            { label: 'Posts', value: user.stat_posts },
            { label: 'Saves', value: user.stat_saves },
            { label: 'Following', value: user.stat_following },
          ]} />
        </Animated.View>

        {/* Admin access */}
        {(user.role === 'admin' || user.role === 'moderator') && (
          <Animated.View entering={FadeInDown.delay(175).springify()}>
            <Pressable
              onPress={() => router.push('/(app)/admin' as never)}
              style={styles.adminBanner}
            >
              <Shield size={20} color={Colors.brand[400]} />
              <Text style={styles.adminBannerText}>Admin Dashboard</Text>
              <ChevronRight size={18} color={Colors.brand[400]} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </Animated.View>
        )}

        {/* My Posts quick link */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            onPress={() => router.push('/(app)/admin/posts')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${Colors.brand[500]}20` }]}>
              <FileText size={18} color={Colors.brand[400]} />
            </View>
            <Text style={styles.menuText}>My Posts</Text>
            <ChevronRight size={16} color={Colors.surface[500]} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </Animated.View>

        {/* Sessions */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Card style={{ marginTop: Spacing[4] }}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              <Text style={styles.sessionCount}>{sessions.length}</Text>
            </View>
            {sessions.length === 0 ? (
              <Text style={styles.noSessions}>No active sessions</Text>
            ) : (
              sessions.slice(0, 3).map((s: Record<string, unknown>) => (
                <View key={String(s.id)} style={styles.sessionRow}>
                  <View style={styles.sessionIcon}>
                    <Smartphone size={16} color={Colors.surface[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionDevice}>
                      {(s.device_info as Record<string, string>)?.platform ?? 'Unknown device'}
                    </Text>
                    <Text style={styles.sessionTime}>
                      Last active {formatDistanceToNow(new Date(String(s.last_used_at)), { addSuffix: true })}
                    </Text>
                  </View>
                  <Pressable onPress={() => revokeSessionMut.mutate(String(s.id))} hitSlop={8}>
                    <Text style={styles.revokeText}>Revoke</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </Animated.View>

        {/* Preferences preview */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={{ marginTop: Spacing[4] }}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={{ gap: 10, marginTop: Spacing[3] }}>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Search radius</Text>
                <Text style={styles.prefValue}>{user.preferences?.distance_km ?? 5}km</Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Vibes</Text>
                <Text style={styles.prefValue} numberOfLines={1}>
                  {user.preferences?.vibes?.join(', ') || 'None set'}
                </Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Categories</Text>
                <Text style={styles.prefValue} numberOfLines={1}>
                  {user.preferences?.categories?.join(', ') || 'None set'}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={{ marginTop: Spacing[4] }}>
          <Button
            variant="ghost"
            onPress={handleLogout}
            fullWidth
            icon={<LogOut size={18} color={Colors.surface[700]} />}
          >
            Sign Out
          </Button>
        </Animated.View>

        {/* Danger zone */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={{ marginTop: Spacing[3] }}>
          <Button
            variant="danger"
            onPress={() => setShowDeleteConfirm(true)}
            fullWidth
            icon={<Trash2 size={18} color={Colors.error} />}
          >
            Request Account Deletion
          </Button>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Edit Sheet */}
      <SheetModal visible={showEditSheet} onClose={() => setShowEditSheet(false)} title="Edit Profile">
        <Text style={styles.sheetLabel}>Display Name</Text>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          maxLength={50}
          placeholder="Your name"
          placeholderTextColor={Colors.surface[500]}
          style={styles.sheetInput}
        />
        <Button
          onPress={() => updateMut.mutate({ display_name: editName })}
          loading={updateMut.isPending}
          fullWidth
          style={{ marginTop: Spacing[4] }}
        >
          Save Changes
        </Button>
      </SheetModal>

      {/* Delete Confirm Sheet */}
      <SheetModal visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Account?">
        <View style={styles.deleteWarn}>
          <AlertTriangle size={24} color={Colors.error} />
          <Text style={styles.deleteWarnText}>
            This will permanently delete your account and all data within 30 days. This cannot be undone.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: Spacing[5] }}>
          <Button variant="ghost" onPress={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button
            variant="danger"
            onPress={() => deletionMut.mutate()}
            loading={deletionMut.isPending}
            style={{ flex: 1 }}
          >
            Delete
          </Button>
        </View>
      </SheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  scroll: { paddingHorizontal: Spacing[5] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  editBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCard: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing[2] },
  displayName: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  handle: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], marginTop: 2 },
  adminBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${Colors.brand[500]}10`, borderWidth: 1, borderColor: `${Colors.brand[500]}30`,
    borderRadius: Radius.xl, padding: Spacing[4], marginTop: Spacing[4],
  },
  adminBannerText: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.brand[400] },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginTop: Spacing[3],
  },
  menuIcon: { width: 38, height: 38, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  menuText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.base, color: Colors.surface[800] },
  sectionTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900] },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[4] },
  sessionCount: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surface[200], textAlign: 'center',
    fontFamily: Typography.families.displayMedium, fontSize: 12, color: Colors.surface[700],
    lineHeight: 24,
  },
  noSessions: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[500] },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.surface[200],
  },
  sessionIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surface[200], alignItems: 'center', justifyContent: 'center',
  },
  sessionDevice: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[800] },
  sessionTime: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  revokeText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.error },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  prefLabel: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  prefValue: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[800], maxWidth: '55%', textAlign: 'right' },
  sheetLabel: {
    fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.xs,
    color: Colors.surface[600], textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[300],
    borderRadius: Radius.lg, padding: Spacing[4],
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[900],
  },
  deleteWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: `${Colors.error}10`, borderWidth: 1, borderColor: `${Colors.error}25`,
    borderRadius: Radius.lg, padding: Spacing[4],
  },
  deleteWarnText: { flex: 1, fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[700] },
});
