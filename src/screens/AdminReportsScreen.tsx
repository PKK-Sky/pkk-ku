import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { getAllReportsForAdmin, markAsRead, deleteReport } from '@services';
import { supabase } from '@lib/supabase';
import type { ReportWithDetails, RootStackParamList } from '@types';
import { formatDateTime } from '@utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  danger: '#D92D20',
  dangerBg: '#FEF2F1',
  successBg: '#EAFBF4',
  success: '#0F9D6B',
};

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    const [{ data: sessionData }, { data, error }] = await Promise.all([
      supabase.auth.getSession(),
      getAllReportsForAdmin(),
    ]);
    setAdminUserId(sessionData.session?.user.id ?? null);
    if (error) {
      console.error('[AdminReports] Gagal memuat laporan:', error.message);
    }
    setReports(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    })();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  /** Baris report_recipients milik admin yang sedang login, untuk laporan ini. */
  const myRecipientRow = useCallback(
    (report: ReportWithDetails) => report.recipients?.find((r) => r.recipient_user_id === adminUserId) ?? null,
    [adminUserId]
  );

  const handleMarkRead = useCallback(
    async (report: ReportWithDetails) => {
      const recipientRow = myRecipientRow(report);
      if (!recipientRow || recipientRow.is_read) return;
      setMutatingId(report.id);
      const { error } = await markAsRead(recipientRow.id);
      setMutatingId(null);
      if (error) {
        Alert.alert('Gagal', error.message);
        return;
      }
      load();
    },
    [myRecipientRow, load]
  );

  const handleDelete = useCallback(
    (report: ReportWithDetails) => {
      Alert.alert('Hapus Laporan', `Hapus laporan "${report.activity_name}"? Media terkait ikut terhapus.`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setMutatingId(report.id);
            const { error } = await deleteReport(report.id);
            setMutatingId(null);
            if (error) {
              Alert.alert('Gagal', error.message);
              return;
            }
            load();
          },
        },
      ]);
    },
    [load]
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoadingContainer}>
        <ActivityIndicator color={COLORS.bluePrimary} />
      </View>
    );
  }

  const unreadCount = reports.filter((r) => {
    const row = myRecipientRow(r);
    return row && !row.is_read;
  }).length;

  const visibleReports = filter === 'unread' ? reports.filter((r) => {
    const row = myRecipientRow(r);
    return row && !row.is_read;
  }) : reports;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Semua Laporan Masuk</Text>
          <Text style={styles.headerSub}>{reports.length} laporan · {unreadCount} belum dibaca</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>Semua</Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterChipText, filter === 'unread' && styles.filterChipTextActive]}>
            Belum Dibaca ({unreadCount})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.bluePrimary} />}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.bluePrimary} />
          </View>
        ) : visibleReports.length === 0 ? (
          <Text style={styles.emptyText}>
            {filter === 'unread' ? 'Tidak ada laporan yang belum dibaca.' : 'Belum ada laporan masuk.'}
          </Text>
        ) : (
          visibleReports.map((report) => {
            const recipientRow = myRecipientRow(report);
            const isUnread = !!recipientRow && !recipientRow.is_read;
            const isMutating = mutatingId === report.id;
            return (
              <Pressable
                key={report.id}
                style={[styles.card, isUnread && styles.cardUnread]}
                onPress={() => {
                  if (isUnread) handleMarkRead(report);
                  navigation.navigate('ReportDetail', { reportId: report.id });
                }}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{report.activity_name}</Text>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMeta}>
                  {report.creator_name} · {report.creator_position}
                </Text>
                <Text style={styles.cardMeta}>{report.activity_place} · {formatDateTime(report.created_at)}</Text>
                <Text style={styles.cardMedia}>{report.media?.length ?? 0} foto dokumentasi</Text>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                  >
                    <Text style={styles.actionBtnText}>Buka Detail</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={() => handleDelete(report)}
                    disabled={isMutating}
                  >
                    {isMutating ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Hapus</Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  fontLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.blueDeep,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerTitle: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontFamily: 'Inter_500Medium', marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  filterChip: { borderWidth: 1.4, borderColor: COLORS.line, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: COLORS.bluePrimary, borderColor: COLORS.bluePrimary },
  filterChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.ink },
  filterChipTextActive: { color: '#fff' },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.inkSoft, fontFamily: 'Inter_500Medium', fontSize: 12.5, textAlign: 'center', paddingVertical: 40 },

  card: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: COLORS.line, borderRadius: 16, padding: 14, gap: 4 },
  cardUnread: { borderColor: COLORS.bluePrimary },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 14, color: COLORS.ink },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bluePrimary },
  cardMeta: { fontFamily: 'Inter_500Medium', fontSize: 11.5, color: COLORS.inkSoft },
  cardMedia: { fontFamily: 'Inter_500Medium', fontSize: 10.5, color: '#9AA3B8', marginTop: 2 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    backgroundColor: '#FBFCFF',
  },
  actionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11.5, color: COLORS.ink },
  actionBtnDanger: { borderColor: COLORS.dangerBg, backgroundColor: COLORS.dangerBg },
});
