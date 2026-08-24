import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  useEligibility,
  useMyReports,
  useAnnouncements,
  useNotifications,
} from '@hooks';
import { supabaseUrl } from '@lib/supabase';
import { getPublicUrl } from '@constants';
import { formatTimeAgo } from '@utils';
import type { ScreenProps, ReportStatus, NotificationInboxItem } from '@types';

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  gold: '#FFC629',
  teal: '#22D3B5',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  danger: '#D92D20',
};

const STATUS_META: Record<ReportStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: 'Draf', bg: '#EEF0F6', fg: '#5B6478' },
  submitted: { label: 'Terkirim', bg: '#E7F0FF', fg: '#1D63ED' },
  approved: { label: 'Disetujui', bg: '#E5F9F1', fg: '#0F9D65' },
  rejected: { label: 'Ditolak', bg: '#FDECEC', fg: '#D92D20' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
}

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const eligibility = useEligibility();
  const myReports = useMyReports();
  const announcementsState = useAnnouncements();
  const userId = eligibility.userId ?? null;
  const notifications = useNotifications(userId);

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const member = eligibility.member;
  const displayName = member?.full_name ?? 'Anggota';
  const positionName = member?.position?.name ?? '—';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      eligibility.refetch(),
      myReports.refetch(),
      announcementsState.refetch(),
      notifications.refetch(),
    ]);
    setRefreshing(false);
  }, [eligibility, myReports, announcementsState, notifications]);

  const handleLogout = useCallback(() => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const handleCreateReport = useCallback(() => {
    if (!eligibility.isEligible) {
      Alert.alert(
        'Belum Bisa Membuat Laporan',
        eligibility.error ?? 'Akun Anda belum memenuhi syarat untuk membuat laporan.'
      );
      return;
    }
    navigation.navigate('ReportCreate');
  }, [eligibility, navigation]);

  const handleOpenNotification = useCallback(
    async (item: NotificationInboxItem) => {
      if (!item.read_at) {
        await notifications.markRead(item.id);
      }
      if (item.kind === 'report_received' && typeof item.data?.report_id === 'string') {
        setNotifModalVisible(false);
        navigation.navigate('ReportDetail', { reportId: item.data.report_id as string });
      }
    },
    [notifications, navigation]
  );

  const quickActions = useMemo(
    () => [
      {
        key: 'create',
        label: 'Buat Laporan',
        icon: 'add-circle' as const,
        color: COLORS.bluePrimary,
        onPress: handleCreateReport,
      },
      {
        key: 'list',
        label: 'Laporan Saya',
        icon: 'document-text' as const,
        color: COLORS.teal,
        onPress: () => navigation.navigate('ReportList'),
      },
      {
        key: 'announcement',
        label: 'Pengumuman',
        icon: 'megaphone' as const,
        color: COLORS.gold,
        onPress: () =>
          Alert.alert(
            'Pengumuman',
            announcementsState.announcements.length > 0
              ? 'Lihat bagian "Pengumuman" di bawah untuk info terbaru.'
              : 'Belum ada pengumuman aktif saat ini.'
          ),
      },
      {
        key: 'notif',
        label: 'Notifikasi',
        icon: 'notifications' as const,
        color: COLORS.blueDeep,
        onPress: () => setNotifModalVisible(true),
      },
    ],
    [handleCreateReport, navigation, announcementsState.announcements.length]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.bluePrimary} />
        }
      >
        {/* ================= HEADER (gaya e-wallet) ================= */}
        <LinearGradient
          colors={[COLORS.blueDeep, '#152A52']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerIdentity}>
              {member?.avatar_url ? (
                <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(displayName)}</Text>
                </View>
              )}
              <View>
                <Text style={styles.greeting}>Halo, {displayName.split(' ')[0]} 👋</Text>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>{positionName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => setNotifModalVisible(true)}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {notifications.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.iconButton} onPress={handleLogout} hitSlop={8}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* ================= KARTU RINGKASAN (mengambang, gaya saldo e-wallet) ================= */}
        <View style={styles.summaryCardWrap}>
          <LinearGradient
            colors={[COLORS.bluePrimary, COLORS.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTopRow}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.summaryTopLabel}>Status Keanggotaan</Text>
            </View>
            {eligibility.isLoading ? (
              <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.summaryStatus}>
                {eligibility.isEligible ? 'Aktif — Berhak Membuat Laporan ✓' : 'Perlu Perhatian ⚠️'}
              </Text>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{myReports.totalCount}</Text>
                <Text style={styles.summaryStatLabel}>Total Laporan</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{myReports.thisMonthCount}</Text>
                <Text style={styles.summaryStatLabel}>Bulan Ini</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ================= QUICK ACTIONS (gaya menu e-wallet) ================= */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <Pressable key={action.key} style={styles.quickActionItem} onPress={action.onPress}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ================= PENGUMUMAN (carousel) ================= */}
        {announcementsState.announcements.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>📣 Pengumuman</Text>
            <FlatList
              data={announcementsState.announcements}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
              renderItem={({ item }) => (
                <View style={styles.announcementCard}>
                  <Text style={styles.announcementTitle} numberOfLines={1}>
                    {item.title ?? 'Pengumuman'}
                  </Text>
                  <Text style={styles.announcementMessage} numberOfLines={3}>
                    {item.message}
                  </Text>
                  <Text style={styles.announcementTime}>{formatTimeAgo(item.created_at)}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* ================= AKTIVITAS TERBARU (gaya feed Instagram) ================= */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🗂️ Aktivitas Terbaru</Text>
            <Pressable onPress={() => navigation.navigate('ReportList')} hitSlop={8}>
              <Text style={styles.seeAllText}>Lihat semua</Text>
            </Pressable>
          </View>

          {myReports.isLoading ? (
            <ActivityIndicator color={COLORS.bluePrimary} style={{ marginVertical: 24 }} />
          ) : myReports.reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={32} color="#B7BFD1" />
              <Text style={styles.emptyStateText}>Belum ada laporan kegiatan.</Text>
              {eligibility.isEligible && (
                <Pressable onPress={handleCreateReport}>
                  <Text style={styles.emptyStateCta}>Buat laporan pertama →</Text>
                </Pressable>
              )}
            </View>
          ) : (
            myReports.reports.slice(0, 8).map((report) => {
              const status = STATUS_META[report.status];
              const thumbnail = report.media?.[0]
                ? getPublicUrl(supabaseUrl, report.media[0].storage_path)
                : null;

              return (
                <Pressable
                  key={report.id}
                  style={styles.postCard}
                  onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                >
                  <View style={styles.postCardHeader}>
                    {member?.avatar_url ? (
                      <Image source={{ uri: member.avatar_url }} style={styles.postAvatar} />
                    ) : (
                      <View style={styles.postAvatarFallback}>
                        <Text style={styles.postAvatarFallbackText}>{getInitials(displayName)}</Text>
                      </View>
                    )}
                    <View style={styles.postCardHeaderText}>
                      <Text style={styles.postCardName}>{displayName}</Text>
                      <Text style={styles.postCardTime}>{formatTimeAgo(report.created_at)}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusChipText, { color: status.fg }]}>{status.label}</Text>
                    </View>
                  </View>

                  {thumbnail && <Image source={{ uri: thumbnail }} style={styles.postThumbnail} />}

                  <View style={styles.postCardBody}>
                    <Text style={styles.postCardActivityName} numberOfLines={1}>
                      {report.activity_name}
                    </Text>
                    <Text style={styles.postCardMeta} numberOfLines={1}>
                      📍 {report.activity_place}
                    </Text>
                  </View>

                  <View style={styles.postCardFooter}>
                    <Text style={styles.postCardFooterText}>Lihat Detail →</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ================= FAB ================= */}
      {eligibility.isEligible && (
        <Pressable style={styles.fab} onPress={handleCreateReport}>
          <LinearGradient
            colors={[COLORS.bluePrimary, COLORS.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}

      {/* ================= MODAL NOTIFIKASI ================= */}
      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <Pressable style={styles.notifOverlay} onPress={() => setNotifModalVisible(false)}>
          <Pressable style={styles.notifSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifSheetHead}>
              <Text style={styles.notifSheetTitle}>Notifikasi</Text>
              {notifications.unreadCount > 0 && (
                <Pressable onPress={() => notifications.markAllRead()} hitSlop={8}>
                  <Text style={styles.notifMarkAll}>Tandai semua dibaca</Text>
                </Pressable>
              )}
            </View>

            {notifications.isLoading ? (
              <ActivityIndicator color={COLORS.bluePrimary} style={{ marginVertical: 32 }} />
            ) : notifications.notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={28} color="#B7BFD1" />
                <Text style={styles.emptyStateText}>Belum ada notifikasi.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications.notifications}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 420 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.notifItem, !item.read_at && styles.notifItemUnread]}
                    onPress={() => handleOpenNotification(item)}
                  >
                    {!item.read_at && <View style={styles.notifDot} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.notifItemBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                      <Text style={styles.notifItemTime}>{formatTimeAgo(item.created_at)}</Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { paddingBottom: 40 },

  header: { paddingHorizontal: 20, paddingBottom: 48 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarFallbackText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  greeting: { color: '#fff', fontSize: 15, fontWeight: '700' },
  positionBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,198,41,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  positionBadgeText: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  summaryCardWrap: { paddingHorizontal: 20, marginTop: -34 },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: COLORS.bluePrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryTopLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  summaryStatus: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 6 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 14 },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStatItem: { flex: 1, alignItems: 'center' },
  summaryStatValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  summaryStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  summaryStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  quickActionItem: { alignItems: 'center', width: 72 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionLabel: { fontSize: 11, color: COLORS.ink, marginTop: 6, textAlign: 'center', fontWeight: '600' },

  sectionBlock: { marginTop: 28, paddingLeft: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
  seeAllText: { fontSize: 12.5, color: COLORS.bluePrimary, fontWeight: '600', marginBottom: 12 },

  announcementCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  announcementTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  announcementMessage: { fontSize: 12, color: COLORS.inkSoft, lineHeight: 17 },
  announcementTime: { fontSize: 10.5, color: '#9AA3B8', marginTop: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 28, paddingRight: 20, gap: 6 },
  emptyStateText: { fontSize: 12.5, color: COLORS.inkSoft },
  emptyStateCta: { fontSize: 12.5, color: COLORS.bluePrimary, fontWeight: '700', marginTop: 4 },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginRight: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  postCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  postAvatar: { width: 32, height: 32, borderRadius: 16 },
  postAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarFallbackText: { fontSize: 11, fontWeight: '700', color: COLORS.ink },
  postCardHeaderText: { flex: 1 },
  postCardName: { fontSize: 12.5, fontWeight: '700', color: COLORS.ink },
  postCardTime: { fontSize: 10.5, color: '#9AA3B8', marginTop: 1 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 10.5, fontWeight: '700' },
  postThumbnail: { width: '100%', height: 180, backgroundColor: '#F1F3F9' },
  postCardBody: { paddingHorizontal: 12, paddingTop: 10 },
  postCardActivityName: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink },
  postCardMeta: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 },
  postCardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    marginTop: 10,
  },
  postCardFooterText: { fontSize: 11.5, fontWeight: '700', color: COLORS.bluePrimary },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    borderRadius: 30,
    shadowColor: COLORS.bluePrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  fabGradient: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  notifOverlay: { flex: 1, backgroundColor: 'rgba(11,30,61,0.5)', justifyContent: 'flex-end' },
  notifSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  notifSheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  notifSheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
  notifMarkAll: { fontSize: 11.5, color: COLORS.bluePrimary, fontWeight: '600' },
  notifItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  notifItemUnread: { backgroundColor: '#F7FAFF' },
  notifDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.bluePrimary, marginTop: 6 },
  notifItemTitle: { fontSize: 12.5, fontWeight: '700', color: COLORS.ink },
  notifItemBody: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 },
  notifItemTime: { fontSize: 10, color: '#9AA3B8', marginTop: 4 },
});
