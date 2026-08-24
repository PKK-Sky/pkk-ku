import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Announcement } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAnnouncements'>;

export default function AdminAnnouncementsScreen({ navigation }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  }, []);

  const toggleActive = async (item: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Konfirmasi', 'Hapus pengumuman ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else fetchAnnouncements();
        },
      },
    ]);
  };

  const isActiveNow = (item: Announcement) => {
    if (!item.is_active) return false;
    const now = new Date();
    const start = item.start_at ? new Date(item.start_at) : null;
    const end = item.end_at ? new Date(item.end_at) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Kelola Pengumuman</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminAddAnnouncement')}
          style={styles.topbarIcon}
        >
          <Text style={styles.topbarIconText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {announcements.map(item => {
          const active = isActiveNow(item);
          return (
            <View key={item.id} style={[styles.card, active ? styles.cardActive : styles.cardInactive]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title || 'Tanpa Judul'}</Text>
                <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
                <View style={styles.cardFooter}>
                  <View style={[styles.badge, { backgroundColor: active ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.badgeText, { color: active ? '#065F46' : '#991B1B' }]}>
                      {active ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>
                    {item.start_at ? new Date(item.start_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                    {' — '}
                    {item.end_at ? new Date(item.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => toggleActive(item)}>
                  <Text style={styles.actionText}>
                    {active ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('AdminAddAnnouncement', { announcementId: item.id })}>
                  <Text style={styles.actionText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionText, { color: COLORS.danger }]}>🗑️ Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('AdminAddAnnouncement')}
        >
          <Text style={styles.btnPrimaryText}>+ Buat Pengumuman Baru</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    margin: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardActive: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  cardInactive: { borderLeftWidth: 4, borderLeftColor: COLORS.textMuted, opacity: 0.85 },
  cardContent: { marginBottom: 12 },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  cardMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardDate: { fontSize: 12, color: COLORS.textMuted },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  btnPrimary: {
    margin: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
