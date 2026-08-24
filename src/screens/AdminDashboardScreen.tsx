import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  blockedMembers: number;
  totalReports: number;
  unreadReports: number;
  activePosts: number;
  activeAnnouncements: number;
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0, activeMembers: 0, pendingMembers: 0, blockedMembers: 0,
    totalReports: 0, unreadReports: 0, activePosts: 0, activeAnnouncements: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      // Members
      const { data: members } = await supabase.from('members').select('registration_status');
      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter(m => m.registration_status === 'active').length || 0;
      const pendingMembers = members?.filter(m => m.registration_status === 'pending').length || 0;
      const blockedMembers = members?.filter(m => m.registration_status === 'blocked').length || 0;

      // Reports
      const { data: reports } = await supabase.from('reports').select('id');
      const totalReports = reports?.length || 0;

      // Unread reports for admin
      const { data: unread } = await supabase
        .from('report_recipients')
        .select('id', { count: 'exact' })
        .eq('is_read', false)
        .eq('recipient_type', 'admin');
      const unreadReports = unread?.length || 0;

      // Active posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .gt('expires_at', new Date().toISOString());
      const activePosts = posts?.length || 0;

      // Active announcements
      const now = new Date().toISOString();
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id')
        .eq('is_active', true)
        .lte('start_at', now)
        .gte('end_at', now);
      const activeAnnouncements = announcements?.length || 0;

      setStats({
        totalMembers, activeMembers, pendingMembers, blockedMembers,
        totalReports, unreadReports, activePosts, activeAnnouncements,
      });
    } catch (err) {
      console.error('fetchStats error', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const MenuCard = ({ icon, title, subtitle, color, onPress }: any) => (
    <TouchableOpacity style={styles.menuCard} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.menuIconText, { color }]}>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Admin PKK</Text>
            <Text style={styles.headerRole}>Administrator</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AdminNotifications')} style={styles.notifBtn}>
            <Text style={styles.notifText}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalMembers}</Text>
            <Text style={styles.statLabel}>Total Anggota</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.activeMembers}</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.pendingMembers}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.blockedMembers}</Text>
            <Text style={styles.statLabel}>Diblokir</Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KELOLA</Text>
        <MenuCard
          icon="👥"
          title="Kelola Anggota"
          subtitle="CRUD data anggota PKK"
          color={COLORS.primary}
          onPress={() => navigation.navigate('AdminMembers')}
        />
        <MenuCard
          icon="🖼️"
          title="Kelola Postingan"
          subtitle="Moderasi feed sosial"
          color={COLORS.warning}
          onPress={() => navigation.navigate('AdminPosts')}
        />
        <MenuCard
          icon="📄"
          title="Kelola Laporan"
          subtitle="Lihat & hapus laporan masuk"
          color={COLORS.info}
          onPress={() => navigation.navigate('AdminReports')}
        />
        <MenuCard
          icon="📢"
          title="Kelola Pengumuman"
          subtitle="Buat & atur pengumuman"
          color={COLORS.success}
          onPress={() => navigation.navigate('AdminAnnouncements')}
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RINGKASAN</Text>
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.totalReports}</Text>
            <Text style={styles.quickStatLabel}>Total Laporan</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatNumber, { color: COLORS.danger }]}>{stats.unreadReports}</Text>
            <Text style={styles.quickStatLabel}>Belum Dibaca</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.activePosts}</Text>
            <Text style={styles.quickStatLabel}>Postingan Aktif</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{stats.activeAnnouncements}</Text>
            <Text style={styles.quickStatLabel}>Pengumuman Aktif</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Keluar</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerRole: { fontSize: 13, color: COLORS.textSecondary },
  notifBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: { fontSize: 18 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: { fontSize: 20 },
  menuContent: { flex: 1 },
  menuTitle: { fontWeight: '600', fontSize: 15 },
  menuSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: COLORS.textMuted },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  quickStatNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  quickStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  logoutBtn: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
