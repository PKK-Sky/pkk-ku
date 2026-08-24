import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Report } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReports'>;

export default function AdminReportsScreen({ navigation }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'read' | 'all'>('incoming');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      // Ambil semua reports + cek read status untuk admin
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select('*, media:report_media(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Ambil report_recipients untuk admin
      const { data: recipients } = await supabase
        .from('report_recipients')
        .select('*')
        .eq('recipient_type', 'admin');

      const reportsWithRead = (reportsData || []).map(r => ({
        ...r,
        adminRead: recipients?.some(rec => rec.report_id === r.id && rec.is_read) || false,
      }));

      setReports(reportsWithRead);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, []);

  const filteredReports = reports.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'incoming') return !r.adminRead;
    return r.adminRead;
  });

  const markAsRead = async (reportId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    await supabase
      .from('report_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('report_id', reportId)
      .eq('recipient_user_id', user.user.id);
    fetchReports();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Kelola Laporan</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {(['incoming', 'read', 'all'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'incoming' ? 'Masuk' : tab === 'read' ? 'Sudah Dibaca' : 'Semua'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredReports.map(report => (
          <TouchableOpacity
            key={report.id}
            style={styles.listItem}
            onPress={() => {
              markAsRead(report.id);
              navigation.navigate('ReportDetail', { reportId: report.id });
            }}
          >
            <View style={[styles.listAvatar, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.listAvatarText}>LP</Text>
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{report.activity_name}</Text>
              <Text style={styles.listSubtitle}>
                {report.creator_name} · {report.creator_position}
              </Text>
            </View>
            <View style={styles.listMeta}>
              <Text style={styles.listTime}>
                {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </Text>
              <View style={[styles.badge, { backgroundColor: report.adminRead ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.badgeText, { color: report.adminRead ? '#065F46' : '#92400E' }]}>
                  {report.adminRead ? 'Dibaca' : 'Baru'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    gap: 16,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listMeta: { alignItems: 'flex-end' },
  listTime: { fontSize: 12, color: COLORS.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
