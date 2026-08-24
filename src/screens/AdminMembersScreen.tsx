import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Member, Position } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMembers'>;

export default function AdminMembersScreen({ navigation }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [, setPositions] = useState<Position[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'blocked'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*, position:positions(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPositions = async () => {
    const { data } = await supabase.from('positions').select('*').order('sort_order');
    setPositions(data || []);
  };

  useEffect(() => {
    fetchMembers();
    fetchPositions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  }, []);

  const handleBlock = async (memberId: string, currentStatus: string) => {
    const action = currentStatus === 'blocked' ? 'buka blokir' : 'blokir';
    Alert.alert('Konfirmasi', `Yakin ingin ${action} anggota ini?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya',
        onPress: async () => {
          const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
          const { error } = await supabase
            .from('members')
            .update({ registration_status: newStatus })
            .eq('id', memberId);
          if (error) Alert.alert('Error', error.message);
          else fetchMembers();
        },
      },
    ]);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      (m.position?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || m.registration_status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { text: 'Aktif', color: COLORS.success, bg: '#D1FAE5' };
      case 'pending': return { text: 'Pending', color: COLORS.warning, bg: '#FEF3C7' };
      case 'blocked': return { text: 'Diblokir', color: COLORS.danger, bg: '#FEE2E2' };
      default: return { text: status, color: COLORS.textSecondary, bg: COLORS.border };
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Kelola Anggota</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminAddMember')} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari anggota..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {(['all', 'active', 'pending', 'blocked'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'Semua' : tab === 'active' ? 'Aktif' : tab === 'pending' ? 'Pending' : 'Diblokir'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredMembers.map(member => {
          const badge = getStatusBadge(member.registration_status);
          return (
            <View key={member.id} style={styles.listItem}>
              <View style={styles.listAvatar}>
                <Text style={styles.listAvatarText}>{getInitials(member.full_name)}</Text>
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{member.full_name}</Text>
                <Text style={styles.listSubtitle}>
                  {member.position?.name || 'Jabatan tidak diketahui'} · {member.phone}
                </Text>
              </View>
              <View style={styles.listMeta}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleBlock(member.id, member.registration_status)}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ fontSize: 12, color: COLORS.danger }}>
                    {member.registration_status === 'blocked' ? 'Buka Blokir' : 'Blokir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {filteredMembers.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada anggota</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminAddMember')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  searchBar: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    padding: 10,
    paddingLeft: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    fontSize: 14,
    backgroundColor: COLORS.background,
  },
  tabsContainer: { backgroundColor: COLORS.white, maxHeight: 50 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 2,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  list: { flex: 1 },
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listMeta: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  fabText: { color: COLORS.white, fontSize: 28, fontWeight: '300' },
});
