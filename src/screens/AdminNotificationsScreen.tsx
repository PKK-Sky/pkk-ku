import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, NotificationInbox } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminNotifications'>;

export default function AdminNotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationInbox[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase
        .from('notification_inbox')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Subscribe realtime
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_inbox' },
        () => fetchNotifications()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notification_inbox').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const getIcon = (kind: string) => {
    switch (kind) {
      case 'report_received': return '📄';
      case 'announcement': return '📢';
      case 'social_activity': return '🖼️';
      case 'chat_message': return '💬';
      default: return '🔔';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Notifikasi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications.map(notif => (
          <TouchableOpacity
            key={notif.id}
            style={[styles.listItem, !notif.is_read && styles.listItemUnread]}
            onPress={() => markAsRead(notif.id)}
          >
            <View style={[styles.listAvatar, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.listAvatarText}>{getIcon(notif.kind)}</Text>
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{notif.title}</Text>
              <Text style={styles.listSubtitle} numberOfLines={2}>{notif.body}</Text>
            </View>
            <View style={styles.listMeta}>
              <Text style={styles.listTime}>
                {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {!notif.is_read && <View style={styles.unreadDot} />}
            </View>
          </TouchableOpacity>
        ))}
        {notifications.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada notifikasi</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topbarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarIconText: { fontSize: 18, color: COLORS.primary },
  topbarTitle: { fontSize: 17, fontWeight: '700' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listItemUnread: { backgroundColor: '#F0FDFA' },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listAvatarText: { fontSize: 20 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listMeta: { alignItems: 'flex-end' },
  listTime: { fontSize: 12, color: COLORS.textMuted },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginTop: 4,
  },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
