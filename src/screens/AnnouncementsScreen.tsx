import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Announcement } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Announcements'>;

export default function AnnouncementsScreen({ navigation }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Announcements] gagal memuat data:', error.message);
      setAnnouncements([]);
      return;
    }
    setAnnouncements((data || []) as Announcement[]);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  }, [loadAnnouncements]);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pengumuman</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={announcements}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={announcements.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Belum ada pengumuman</Text>
            <Text style={styles.emptyText}>Pengumuman aktif akan muncul di sini.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title || 'Pengumuman'}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: COLORS.primary, fontSize: 22 },
  title: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 18, fontWeight: '700' },
  spacer: { width: 40 },
  list: { padding: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  cardAccent: { width: 4, backgroundColor: COLORS.primary },
  cardContent: { flex: 1, padding: 16 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  cardMessage: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 7 },
  cardDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 12 },
});