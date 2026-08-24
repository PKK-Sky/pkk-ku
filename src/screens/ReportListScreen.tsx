import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ReportWithDetails } from '@types';
import { getMyReports } from '@services';
import { formatDateTime } from '@utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReportListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await getMyReports();
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReports(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const renderItem = ({ item }: { item: ReportWithDetails }) => (
    <Pressable
      onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
      style={styles.item}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.activity} numberOfLines={2}>{item.activity_name}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.activity_place}</Text>
        <Text style={styles.status}>{item.status === 'sent' ? 'Terkirim' : item.status}</Text>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0B5D59" />
        <Text style={styles.muted}>Memuat laporan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={loadReports} style={styles.retryButton}>
          <Text style={styles.retryText}>Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AKTIVITAS</Text>
          <Text style={styles.title}>Daftar Laporan</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('ReportCreate')} style={styles.addButton}>
          <Text style={styles.addText}>+ Baru</Text>
        </Pressable>
      </View>
      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Belum ada laporan</Text>
          <Text style={styles.emptyText}>Laporan yang Anda kirim akan tampil di sini.</Text>
          <Pressable onPress={() => navigation.navigate('ReportCreate')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Buat laporan pertama</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadReports} tintColor="#0B5D59" />}
          onRefresh={loadReports}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FBFA', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: '#0E8A82', fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  title: { color: '#0B2B29', fontSize: 28, fontWeight: '700', marginTop: 4 },
  addButton: { backgroundColor: '#0B5D59', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addText: { color: '#FFFFFF', fontWeight: '700' },
  list: { paddingBottom: 24 },
  item: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0ECE8', borderRadius: 12, padding: 16, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activity: { flex: 1, color: '#0B2B29', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  chevron: { color: '#0E8A82', fontSize: 25, lineHeight: 20, marginLeft: 8 },
  date: { color: '#5C7B77', fontSize: 12, marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  meta: { flex: 1, color: '#5C7B77', fontSize: 13, marginRight: 10 },
  status: { color: '#2E7D32', backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FBFA', padding: 24 },
  muted: { color: '#5C7B77', marginTop: 10 },
  error: { color: '#C62828', textAlign: 'center', lineHeight: 21 },
  retryButton: { marginTop: 14, borderWidth: 1, borderColor: '#0B5D59', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: '#0B5D59', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyTitle: { color: '#0B2B29', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#5C7B77', textAlign: 'center', marginTop: 7, lineHeight: 20 },
  primaryButton: { backgroundColor: '#0B5D59', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, marginTop: 18 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
});
