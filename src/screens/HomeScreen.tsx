import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, MemberWithPosition, ReportWithDetails } from '@types';
import { useAuthContext } from '@context/AuthContext';
import { useAuth } from '@hooks';
import { getMyReports, getRecipientReports } from '@services';
import { supabase } from '@lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HomeState = {
  member: MemberWithPosition | null;
  myReports: ReportWithDetails[];
  unreadReports: number;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();
  const { logout, isLoading: isLoggingOut } = useAuth();
  const [state, setState] = useState<HomeState>({
    member: null,
    myReports: [],
    unreadReports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async (refresh = false) => {
    if (!user?.id) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [memberResult, reportsResult, recipientResult] = await Promise.all([
        supabase
          .from('members')
          .select('*, position:positions(*)')
          .eq('user_id', user.id)
          .maybeSingle(),
        getMyReports(),
        getRecipientReports(),
      ]);

      if (memberResult.error) throw memberResult.error;
      if (reportsResult.error) throw reportsResult.error;
      if (recipientResult.error) throw recipientResult.error;

      setState({
        member: memberResult.data as MemberWithPosition | null,
        myReports: reportsResult.data ?? [],
        unreadReports: recipientResult.data?.length ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat beranda.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useFocusEffect(
    useCallback(() => {
      loadHome(true);
    }, [loadHome])
  );

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success) setError(result.error ?? 'Logout gagal.');
  };

  const memberName = state.member?.full_name ?? user?.phone ?? 'Anggota';
  const positionName = state.member?.position?.name ?? 'Jabatan belum tersedia';

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0B5D59" />
        <Text style={styles.muted}>Memuat data anggota...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadHome(true)} tintColor="#0B5D59" />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PKK WARAKAS</Text>
          <Text style={styles.title}>Beranda</Text>
        </View>
        <Pressable onPress={handleLogout} disabled={isLoggingOut} style={styles.logout}>
          <Text style={styles.logoutText}>{isLoggingOut ? '...' : 'Keluar'}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadHome()}><Text style={styles.retry}>Coba lagi</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.profileCard}>
        <Text style={styles.cardLabel}>ANGGOTA AKTIF</Text>
        <Text style={styles.memberName}>{memberName}</Text>
        <Text style={styles.position}>{positionName}</Text>
        <Text style={styles.phone}>{state.member?.phone ?? user?.phone ?? 'Nomor belum tersedia'}</Text>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Laporan saya" value={String(state.myReports.length)} />
        <Stat label="Belum dibaca" value={String(state.unreadReports)} />
      </View>

      <Text style={styles.sectionTitle}>AKSI</Text>
      <ActionButton
        title="Buat laporan kegiatan"
        description="Kirim laporan baru sesuai jabatan Anda"
        onPress={() => navigation.navigate('ReportCreate')}
        primary
      />
      <ActionButton
        title="Lihat laporan saya"
        description="Buka riwayat laporan yang telah dikirim"
        onPress={() => navigation.navigate('ReportList')}
      />

      <Text style={styles.sectionTitle}>STATUS AKUN</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, state.member?.registration_status === 'active' ? styles.active : styles.inactive]} />
        <Text style={styles.statusText}>
          {state.member?.registration_status === 'active' ? 'Akun aktif' : 'Status akun belum aktif'}
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  title,
  description,
  onPress,
  primary = false,
}: {
  title: string;
  description: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.action, primary && styles.actionPrimary]}>
      <Text style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>{title}</Text>
      <Text style={[styles.actionDescription, primary && styles.actionDescriptionPrimary]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FBFA' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FBFA' },
  muted: { color: '#5C7B77', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { color: '#0E8A82', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#0B2B29', fontSize: 30, fontWeight: '700', marginTop: 4 },
  logout: { borderWidth: 1, borderColor: '#C7E3DE', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 8 },
  logoutText: { color: '#0B5D59', fontWeight: '600' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 14, marginBottom: 16 },
  errorText: { color: '#C62828', lineHeight: 20 },
  retry: { color: '#0B5D59', fontWeight: '700', marginTop: 8 },
  profileCard: { backgroundColor: '#0B5D59', borderRadius: 16, padding: 22, marginBottom: 14 },
  cardLabel: { color: '#A7E5DC', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  memberName: { color: '#FFFFFF', fontSize: 25, fontWeight: '700', marginTop: 14 },
  position: { color: '#D7F6F1', fontSize: 15, marginTop: 5 },
  phone: { color: '#A7E5DC', fontSize: 13, marginTop: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D0ECE8' },
  statValue: { color: '#0B5D59', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#5C7B77', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#5C7B77', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10, marginTop: 8 },
  action: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D0ECE8', padding: 17, marginBottom: 10 },
  actionPrimary: { backgroundColor: '#E4F6F2', borderColor: '#8DD8CF' },
  actionTitle: { color: '#0B2B29', fontSize: 16, fontWeight: '700' },
  actionTitlePrimary: { color: '#0B5D59' },
  actionDescription: { color: '#5C7B77', fontSize: 13, marginTop: 5 },
  actionDescriptionPrimary: { color: '#277B73' },
  statusRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D0ECE8' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  active: { backgroundColor: '#2E7D32' },
  inactive: { backgroundColor: '#F57F17' },
  statusText: { color: '#0B2B29', fontSize: 14 },
});
