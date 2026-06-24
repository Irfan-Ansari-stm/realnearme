import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Notification } from '@/types';
import { Check, Trash2 } from 'lucide-react-native';
import { safeHaptics } from '@/utils/haptics';

const TYPE_ICON: Record<string, string> = {
  like: '❤️', comment: '💬', new_nearby: '📍',
  milestone: '🏆', system: '🔔',
};

interface Props {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notif, onMarkRead, onDelete }: Props) {
  return (
    <View style={[styles.container, !notif.is_read && styles.unread]}>
      <View style={[styles.icon, !notif.is_read && styles.iconUnread]}>
        <Text style={{ fontSize: 20 }}>{TYPE_ICON[notif.type] ?? '🔔'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !notif.is_read && styles.titleUnread]}>
          {notif.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </Text>
      </View>
      <View style={styles.actions}>
        {!notif.is_read && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => { safeHaptics.selection(); onMarkRead(notif.id); }}
          >
            <Check size={15} color={Colors.success} />
          </Pressable>
        )}
        <Pressable
          style={styles.actionBtn}
          onPress={() => { safeHaptics.impactMedium(); onDelete(notif.id); }}
        >
          <Trash2 size={15} color={Colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: Spacing[4], borderRadius: Radius.xl,
    backgroundColor: Colors.surface[100],
    borderWidth: 1, borderColor: Colors.surface[200],
    marginBottom: Spacing[2],
  },
  unread: {
    backgroundColor: `${Colors.brand[500]}0A`,
    borderColor: `${Colors.brand[500]}30`,
  },
  icon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing[3], flexShrink: 0,
  },
  iconUnread: { backgroundColor: `${Colors.brand[500]}15` },
  content: { flex: 1 },
  title: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.sm, color: Colors.surface[700],
    marginBottom: 3,
  },
  titleUnread: { color: Colors.surface[900], fontFamily: Typography.families.bodySemiBold },
  body: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], lineHeight: 17 },
  time: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], marginTop: 5 },
  actions: { flexDirection: 'column', gap: 6, marginLeft: Spacing[2] },
  actionBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surface[150],
    alignItems: 'center', justifyContent: 'center',
  },
});
