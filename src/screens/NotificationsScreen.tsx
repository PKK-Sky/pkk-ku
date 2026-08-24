import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, NotificationInbox, NotificationPreferences } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationInbox[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: notifData } = await supabase
      .from('notification_inbox')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    setNotifications(notifData || []);

    const { data: prefData } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.user.id)
      .single();
    setPreferences(prefData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_inbox' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchData(); setRefreshing(false);
  }, []);

  const markAllRead = async () => {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from('notification_inbox').update({ is_read: true }).eq('user_id', user.user?.id);
    fetchData();
  };

  const togglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const { data: user } = await supabase.auth.getUser();
    const newValue = !preferences[key];
    await supabase.from('notification_preferences').update({ [key]: newValue }).eq('user_id', user.user?.id);
    setPreferences({ ...preferences, [key]: newValue });
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

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {notifications.map(notif => (
          <View key={notif.id} style={[styles.listItem, !notif.is_read && styles.listItemUnread]}>
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
          </View>
        ))}

        {notifications.length > 0 && (
          <TouchableOpacity style={styles.btnGhost} onPress={markAllRead}>
            <Text style={styles.btnGhostText}>Tandai Semua Dibaca</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PENGATURAN</Text>
          {preferences && (
            <>
              <ToggleRow label="Notifikasi Chat" desc="Pesan masuk" value={preferences.chat_messages} onToggle={() => togglePref('chat_messages')} />
              <ToggleRow label="Notifikasi Laporan" desc="Status laporan" value={preferences.report_received} onToggle={() => togglePref('report_received')} />
              <ToggleRow label="Notifikasi Feed" desc="Like, komen, postingan baru" value={preferences.social_activity} onToggle={() => togglePref('social_activity')} />
              <ToggleRow label="Notifikasi Pengumuman" desc="Pengumuman baru dari admin" value={preferences.announcements} onToggle={() => togglePref('announcements')} />
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.toggleCard}>
      <View>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white, padding: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  topbarIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  topbarIconText: { fontSize: 18, color: COLORS.primary },
  topbarTitle: { fontSize: 17, fontWeight: '700' },
  listItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listItemUnread: { backgroundColor: '#F0FDFA' },
  listAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  listAvatarText: { fontSize: 20 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listMeta: { alignItems: 'flex-end' },
  listTime: { fontSize: 12, color: COLORS.textMuted },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.danger, marginTop: 4,
  },
  btnGhost: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: COLORS.primaryLight, alignItems: 'center',
  },
  btnGhostText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10,
  },
  toggleCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  toggleLabel: { fontWeight: '600' },
  toggleDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
