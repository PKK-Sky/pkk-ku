import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ReportWithDetails, Announcement } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';
import { getMyReports } from '@services';
import { formatTimeAgo } from '../utils/date';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LaporanHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [{ data: reportData, error: reportError }, { data: annData }] = await Promise.all([
      getMyReports(),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3),
    ]);
    if (reportError) {
      setError(reportError.message || 'Laporan gagal dimuat.');
    } else {
      setReports(reportData || []);
    }
    setAnnouncements(annData || []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const now = new Date();
  const thisMonthReports = reports.filter(r => {
    const d = new Date(r.activity_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const menuItems: Array<{
    key: string;
    label: string;
    desc: string;
    icon: string;
    color: string;
    bg: string;
    onPress: () => void;
  }> = [
    {
      key: 'create',
      label: 'Buat Laporan',
      desc: 'Laporkan kegiatan baru',
      icon: '📝',
      color: '#2563EB',
      bg: '#DBEAFE',
      onPress: () => navigation.navigate('ReportCreate'),
    },
    {
      key: 'list',
      label: 'Laporan Saya',
      desc: `${reports.length} total dikirim`,
      icon: '📋',
      color: '#D97706',
      bg: '#FEF3C7',
      onPress: () => navigation.navigate('ReportList'),
    },
    {
      key: 'jadwal',
      label: 'Jadwal Kegiatan',
      desc: 'Agenda & riwayat aktivitas',
      icon: '🗓️',
      color: '#16A34A',
      bg: '#DCFCE7',
      onPress: () => navigation.navigate('Jadwal'),
    },
    {
      key: 'announcement',
      label: 'Pengumuman',
      desc: `${announcements.length} pengumuman aktif`,
      icon: '📢',
      color: '#9333EA',
      bg: '#F3E8FF',
      onPress: () => navigation.navigate('Announcements'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Pekerjaan PKK</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Laporan Bulan Ini</Text>
          <Text style={styles.statsValue}>{thisMonthReports.length} Kegiatan</Text>
          <Text style={styles.statsSub}>{reports.length} laporan sepanjang waktu · {announcements.length} pengumuman aktif</Text>
        </View>

        {/* Menu grid */}
        <View style={styles.menuGrid}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.key} style={styles.menuCard} onPress={item.onPress} activeOpacity={0.85}>
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Text style={[styles.menuIconText, { color: item.color }]}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc} numberOfLines={1}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Laporan terbaru */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LAPORAN TERBARU</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReportList')}>
              <Text style={styles.seeAll}>Lihat semua</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Belum ada laporan. Mulai laporkan kegiatan pertama Anda.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('ReportCreate')}>
                <Text style={styles.retryText}>Buat Laporan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reports.slice(0, 5).map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.reportItem}
                onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
              >
                <View style={styles.reportIcon}>
                  <Text style={styles.reportIconText}>📄</Text>
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle} numberOfLines={1}>{item.activity_name}</Text>
                  <Text style={styles.reportMeta} numberOfLines={1}>{item.activity_place} · {formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.reportStatus}>Terkirim</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white,
    padding: 16,
    paddingTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topbarTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  statsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    margin: 12,
  },
  statsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  statsValue: { fontSize: 26, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  statsSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  menuCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    margin: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  menuIconText: { fontSize: 22 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  menuDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  center: { alignItems: 'center', padding: 24 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primaryLight },
  retryText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  reportItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  reportIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  reportIconText: { fontSize: 18 },
  reportContent: { flex: 1 },
  reportTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reportMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  reportStatus: {
    fontSize: 10, fontWeight: '700', color: COLORS.success,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
});
