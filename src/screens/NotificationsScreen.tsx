import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, NotificationInbox, NotificationPreferences } from '../types';
import { COLORS } from '../constants/app';
import { useAuthContext } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthContext();
  const {
    notifications,
    isLoading,
    refetch,
    markRead,
    markAllRead: markAllSystemRead,
  } = useNotifications(user?.id ?? null);

  useEffect(() => {
    if (!user?.id) {
      setPreferences(null);
      return;
    }
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[Notifications] gagal memuat preferensi:', error.message);
        setPreferences(data as NotificationPreferences | null);
      });
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Membuka layar berarti user sudah melihat inbox sistem: badge langsung hilang.
  useEffect(() => {
    if (!isLoading && notifications.some(item => !item.read_at)) {
      void markAllSystemRead();
    }
  }, [isLoading, notifications, markAllSystemRead]);

  const openNotification = async (notification: NotificationInbox) => {
    if (!notification.read_at) await markRead(notification.id);
    const data = notification.data || {};
    const reportId = typeof data.reportId === 'string' ? data.reportId : null;
    if (reportId || notification.kind === 'report_received') {
      if (reportId) navigation.navigate('ReportDetail', { reportId });
      return;
    }
    if (notification.kind === 'announcement') navigation.navigate('Announcements');
  };

  const togglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences || !user?.id) return;
    const newValue = !preferences[key];
    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: newValue })
      .eq('user_id', user.id);
    if (error) {
      console.error('[Notifications] gagal menyimpan preferensi:', error.message);
      return;
    }
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
        {isLoading ? (
          <View style={styles.center}><Text style={styles.emptyText}>Memuat notifikasi...</Text></View>
        ) : notifications.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Belum ada notifikasi sistem</Text><Text style={styles.emptyText}>Pembaruan, pengumuman, dan status laporan akan muncul di sini.</Text></View>
        ) : notifications.map(notif => (
          <TouchableOpacity key={notif.id} onPress={() => openNotification(notif)} style={[styles.listItem, !notif.read_at && styles.listItemUnread]}>
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
              {!notif.read_at && <View style={styles.unreadDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {notifications.length > 0 && (
          <TouchableOpacity style={styles.btnGhost} onPress={markAllSystemRead}>
            <Text style={styles.btnGhostText}>Tandai Semua Dibaca</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PENGATURAN</Text>
          {preferences && (
            <>
              <ToggleRow label="Notifikasi Laporan" desc="Status laporan" value={preferences.report_received} onToggle={() => togglePref('report_received')} />
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
