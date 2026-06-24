import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Badge, Skeleton, SheetModal, Button, EmptyState } from '@/components/ui';
import { Users, Search, ChevronLeft, Ban, CheckCircle, Shield } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

const roleBadgeColor: Record<string, string> = {
  admin: Colors.brand[500],
  moderator: Colors.info,
  user: Colors.surface[500],
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [banModal, setBanModal] = useState<{ userId: string; handle: string; ban: boolean } | null>(null);
  const [roleModal, setRoleModal] = useState<{ userId: string; handle: string; current: string } | null>(null);
  const [newRole, setNewRole] = useState('user');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => usersApi.adminList({ page, limit: 20, ...(search && { search }) }),
    placeholderData: keepPreviousData,
  });

  const banMut = useMutation({
    mutationFn: ({ userId, ban, reason }: { userId: string; ban: boolean; reason?: string }) =>
      ban ? usersApi.banUser(userId, reason) : usersApi.unbanUser(userId),
    onSuccess: (_, { ban }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(ban ? 'User banned' : 'User unbanned');
      setBanModal(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => usersApi.setRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated');
      setRoleModal(null);
    },
    onError: () => toast.error('Failed'),
  });

  const users = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <Text style={styles.title}>Users ({total})</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={Colors.surface[500]} />
        <TextInput
          value={search}
          onChangeText={t => { setSearch(t); setPage(1); }}
          placeholder="Search name, handle, email..."
          placeholderTextColor={Colors.surface[500]}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={72} style={{ marginBottom: 10 }} />)}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u: Record<string, unknown>) => String(u.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item: u }: { item: Record<string, unknown> }) => (
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: `${Colors.brand[500]}25` }]}>
                <Text style={styles.avatarText}>{String(u.display_name ?? '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.displayName}>{String(u.display_name)}</Text>
                <Text style={styles.handle}>@{String(u.handle)}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Badge color={roleBadgeColor[String(u.role)] ?? Colors.surface[500]}>{String(u.role)}</Badge>
                  <Badge color={u.is_active ? Colors.success : Colors.error}>
                    {u.is_active ? 'Active' : 'Banned'}
                  </Badge>
                </View>
              </View>
              <View style={styles.userActions}>
                <Pressable
                  onPress={() => { setRoleModal({ userId: String(u.id), handle: String(u.handle), current: String(u.role) }); setNewRole(String(u.role)); }}
                  style={styles.iconBtn}
                >
                  <Shield size={16} color={Colors.brand[400]} />
                </Pressable>
                <Pressable
                  onPress={() => setBanModal({ userId: String(u.id), handle: String(u.handle), ban: Boolean(u.is_active) })}
                  style={styles.iconBtn}
                >
                  {u.is_active
                    ? <Ban size={16} color={Colors.error} />
                    : <CheckCircle size={16} color={Colors.success} />
                  }
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon={<Users size={28} color={Colors.surface[500]} />} title="No users found" />}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Ban/Unban sheet */}
      <SheetModal
        visible={!!banModal}
        onClose={() => setBanModal(null)}
        title={banModal?.ban ? `Ban @${banModal?.handle}` : `Unban @${banModal?.handle}`}
      >
        <Text style={styles.sheetDesc}>
          {banModal?.ban
            ? 'This will ban the user and revoke all their active sessions.'
            : 'The user will be able to log in again.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: Spacing[5] }}>
          <Button variant="ghost" onPress={() => setBanModal(null)} style={{ flex: 1 }}>Cancel</Button>
          <Button
            variant="danger"
            onPress={() => banMut.mutate({ userId: banModal!.userId, ban: banModal!.ban })}
            loading={banMut.isPending}
            style={{ flex: 1 }}
          >
            {banModal?.ban ? 'Ban User' : 'Unban User'}
          </Button>
        </View>
      </SheetModal>

      {/* Role sheet */}
      <SheetModal
        visible={!!roleModal}
        onClose={() => setRoleModal(null)}
        title={`Change role — @${roleModal?.handle}`}
      >
        {['user', 'moderator', 'admin'].map((r) => (
          <Pressable
            key={r}
            onPress={() => setNewRole(r)}
            style={[styles.roleOption, newRole === r && styles.roleOptionActive]}
          >
            <Text style={[styles.roleOptionText, newRole === r && styles.roleOptionTextActive]}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </Pressable>
        ))}
        <Button
          onPress={() => roleMut.mutate({ userId: roleModal!.userId, role: newRole })}
          loading={roleMut.isPending}
          fullWidth
          style={{ marginTop: Spacing[4] }}
        >
          Update Role
        </Button>
      </SheetModal>
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, marginHorizontal: Spacing[4], marginBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  searchInput: {
    flex: 1, height: 48,
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[900],
  },
  list: { paddingHorizontal: Spacing[4] },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[2],
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Typography.families.display, fontSize: 18, color: Colors.brand[400] },
  displayName: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  handle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  userActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  sheetDesc: { fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[700], lineHeight: 22 },
  roleOption: {
    padding: Spacing[4], borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    marginBottom: Spacing[2],
  },
  roleOptionActive: { backgroundColor: `${Colors.brand[500]}15`, borderColor: `${Colors.brand[500]}40` },
  roleOptionText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.base, color: Colors.surface[700] },
  roleOptionTextActive: { color: Colors.brand[400] },
});
