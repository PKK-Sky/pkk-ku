import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Announcement, Member } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [member, setMember] = useState<Member | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState({ reports: 0, posts: 0, chats: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Member info
      const { data: memberData } = await supabase
        .from('members')
        .select('*, position:positions(*)')
        .eq('user_id', user.user.id)
        .single();
      setMember(memberData);

      // Active announcements
      const now = new Date().toISOString();
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('created_at', { ascending: false })
        .limit(3);
      setAnnouncements(annData || []);

      // Stats
      const { data: reports } = await supabase
        .from('reports')
        .select('id')
        .eq('created_by', user.user.id);
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.user.id)
        .gt('expires_at', now);
      const { data: conversations } = await supabase
        .from('chat_members')
        .select('conversation_id')
        .eq('user_id', user.user.id);

      setStats({
        reports: reports?.length || 0,
        posts: posts?.length || 0,
        chats: conversations?.length || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getInitials = (name: string = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Selamat pagi,</Text>
            <Text style={styles.name}>{member?.full_name || 'Anggota'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileText}>{getInitials(member?.full_name || '')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Total Kegiatan Bulan Ini</Text>
        <Text style={styles.statsValue}>{stats.reports + stats.posts} Kegiatan</Text>
        <Text style={styles.statsSub}>{stats.reports} laporan · {stats.posts} postingan</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.reports}</Text>
            <Text style={styles.statLabelSmall}>Laporan</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.posts}</Text>
            <Text style={styles.statLabelSmall}>Posting</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.chats}</Text>
            <Text style={styles.statLabelSmall}>Chat</Text>
          </View>
        </View>
      </View>

      {/* Quick Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MENU CEPAT</Text>
        <View style={styles.shortcutGrid}>
          <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('ReportCreate')}>
            <View style={[styles.shortcutIcon, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.shortcutIconText, { color: '#2563EB' }]}>📄</Text>
            </View>
            <Text style={styles.shortcutLabel}>Buat Laporan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('ReportList')}>
            <View style={[styles.shortcutIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.shortcutIconText, { color: '#D97706' }]}>📋</Text>
            </View>
            <Text style={styles.shortcutLabel}>Laporan Saya</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.shortcutIcon, { backgroundColor: '#F3E8FF' }]}>
              <Text style={[styles.shortcutIconText, { color: '#9333EA' }]}>👤</Text>
            </View>
            <Text style={styles.shortcutLabel}>Profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('Notifications')}>
            <View style={[styles.shortcutIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.shortcutIconText, { color: '#DC2626' }]}>🔔</Text>
            </View>
            <Text style={styles.shortcutLabel}>Notifikasi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Announcements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PENGUMUMAN TERBARU</Text>
        {announcements.map(ann => (
          <View
            key={ann.id}
            style={[styles.annCard, { borderLeftColor: COLORS.primary }]}
          >
            <Text style={styles.annTitle}>{ann.title || 'Pengumuman'}</Text>
            <Text style={styles.annMessage} numberOfLines={2}>{ann.message}</Text>
            <Text style={styles.annDate}>
              {ann.start_at ? new Date(ann.start_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </Text>
          </View>
        ))}
        {announcements.length === 0 && (
          <Text style={styles.emptyText}>Tidak ada pengumuman aktif</Text>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 13, color: COLORS.textSecondary },
  name: { fontSize: 18, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { position: 'relative' },
  notifIcon: { fontSize: 24 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  statsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    margin: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  statsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  statsValue: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  statsSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statNumber: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  statLabelSmall: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIconText: { fontSize: 24 },
  shortcutLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, textAlign: 'center' },
  annCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  annTitle: { fontWeight: '600', fontSize: 14 },
  annMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  annDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', padding: 20 },
});
