import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthContext } from '@context/AuthContext';
import { useAuth } from '@hooks';
import {
  getAdminDashboardStats,
  getAllMembers,
  getPositions,
  registerMember,
  blockMember,
  unblockMember,
  type AdminDashboardStats,
} from '@services';
import type { MemberWithPosition, Position, RegistrationStatus } from '@types';

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  gold: '#FFC629',
  teal: '#22D3B5',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  heroFrom: '#7A4497',
  heroMid: '#6B3985',
  heroTo: '#5C2F72',
  danger: '#D92D20',
  dangerBg: '#FEF2F1',
  warn: '#B7791F',
  warnBg: '#FFF7E6',
  successBg: '#EAFBF4',
  success: '#0F9D6B',
};

const STATUS_META: Record<RegistrationStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktif', color: COLORS.success, bg: COLORS.successBg },
  pending: { label: 'Belum Aktivasi', color: COLORS.warn, bg: COLORS.warnBg },
  blocked: { label: 'Diblokir', color: COLORS.danger, bg: COLORS.dangerBg },
};

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const { logout } = useAuth();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [members, setMembers] = useState<MemberWithPosition[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingMemberId, setMutatingMemberId] = useState<string | null>(null);

  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPositionId, setNewPositionId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadAll = useCallback(async () => {
    const [statsResult, membersResult, positionsResult] = await Promise.all([
      getAdminDashboardStats(),
      getAllMembers(),
      getPositions(),
    ]);

    if (statsResult.data) setStats(statsResult.data);
    if (membersResult.data) setMembers(membersResult.data);
    if (positionsResult.data) {
      setPositions(positionsResult.data);
      if (!newPositionId && positionsResult.data.length > 0) {
        setNewPositionId(positionsResult.data[0].id);
      }
    }

    if (membersResult.error) {
      console.error('[AdminDashboard] Gagal memuat anggota:', membersResult.error.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadAll();
      setIsLoading(false);
    })();
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }, [loadAll]);

  const handleLogout = useCallback(() => {
    Alert.alert('Keluar', 'Keluar dari dashboard admin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const handleOpenRegister = useCallback(() => {
    setNewName('');
    setNewPhone('');
    setNewPositionId(positions[0]?.id ?? null);
    setRegisterModalVisible(true);
  }, [positions]);

  const handleRegister = useCallback(async () => {
    if (!newPositionId) {
      Alert.alert('Lengkapi Data', 'Pilih jabatan terlebih dahulu.');
      return;
    }
    setIsRegistering(true);
    const result = await registerMember({
      fullName: newName,
      phoneInput: newPhone,
      positionId: newPositionId,
    });
    setIsRegistering(false);

    if (result.error) {
      Alert.alert('Gagal Mendaftarkan', result.error.message);
      return;
    }

    setRegisterModalVisible(false);
    Alert.alert(
      'Berhasil',
      `${result.data?.full_name ?? 'Anggota'} terdaftar dengan status "Belum Aktivasi". Anggota perlu aktivasi mandiri (OTP) di aplikasi untuk mengaktifkan akun.`
    );
    loadAll();
  }, [newName, newPhone, newPositionId, loadAll]);

  const handleToggleBlock = useCallback(
    (member: MemberWithPosition) => {
      const isBlocked = member.registration_status === 'blocked';
      Alert.alert(
        isBlocked ? 'Buka Blokir Anggota' : 'Blokir Anggota',
        isBlocked
          ? `Buka blokir ${member.full_name}?`
          : `${member.full_name} tidak akan bisa login setelah diblokir. Lanjutkan?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: isBlocked ? 'Buka Blokir' : 'Blokir',
            style: isBlocked ? 'default' : 'destructive',
            onPress: async () => {
              setMutatingMemberId(member.id);
              const result = isBlocked ? await unblockMember(member) : await blockMember(member.id);
              setMutatingMemberId(null);
              if (result.error) {
                Alert.alert('Gagal', result.error.message);
                return;
              }
              loadAll();
            },
          },
        ]
      );
    },
    [loadAll]
  );

  const handleComingSoon = useCallback((feature: string) => {
    Alert.alert(feature, 'Halaman ini akan segera hadir.');
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoadingContainer}>
        <ActivityIndicator color={COLORS.bluePrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.heroFrom, COLORS.heroMid, COLORS.heroTo]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroEyebrow}>Dashboard Admin</Text>
            <Text style={styles.heroTitle}>My PKK Warakas</Text>
            <Text style={styles.heroSub}>{user?.email ?? 'Admin'}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout} hitSlop={8}>
            <Text style={styles.logoutBtnText}>Keluar</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.bluePrimary} />}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.bluePrimary} />
            <Text style={styles.loadingText}>Memuat data dashboard…</Text>
          </View>
        ) : (
          <>
            {/* ================= STATS ================= */}
            <Text style={styles.sectionTitle}>Ringkasan</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Anggota Aktif" value={stats?.membersActive ?? 0} color={COLORS.success} bg={COLORS.successBg} />
              <StatCard label="Belum Aktivasi" value={stats?.membersPending ?? 0} color={COLORS.warn} bg={COLORS.warnBg} />
              <StatCard label="Total Laporan" value={stats?.reportsTotal ?? 0} color={COLORS.bluePrimary} bg="#EEF3FF" />
              <StatCard label="Laporan Belum Dibaca" value={stats?.reportsUnreadForAdmin ?? 0} color={COLORS.danger} bg={COLORS.dangerBg} />
              <StatCard label="Postingan Aktif" value={stats?.postsActive ?? 0} color={COLORS.teal} bg="#E9FBF7" />
              <StatCard label="Pengumuman Aktif" value={stats?.announcementsActive ?? 0} color={COLORS.gold} bg="#FFF8E1" />
            </View>

            {/* ================= QUICK ACTIONS ================= */}
            <Text style={styles.sectionTitle}>Menu Cepat</Text>
            <View style={styles.quickActions}>
              <QuickAction label="Kelola Pengumuman" icon="📣" onPress={() => handleComingSoon('Kelola Pengumuman')} />
              <QuickAction label="Semua Laporan Masuk" icon="📄" onPress={() => handleComingSoon('Semua Laporan Masuk')} />
              <QuickAction label="Moderasi Postingan" icon="🛡️" onPress={() => handleComingSoon('Moderasi Postingan')} />
            </View>

            {/* ================= MEMBERS ================= */}
            <View style={styles.membersHeaderRow}>
              <Text style={styles.sectionTitle}>Anggota ({members.length})</Text>
              <Pressable style={styles.addMemberBtn} onPress={handleOpenRegister}>
                <Text style={styles.addMemberBtnText}>+ Daftarkan</Text>
              </Pressable>
            </View>

            {members.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada anggota terdaftar.</Text>
            ) : (
              members.map((member) => {
                const meta = STATUS_META[member.registration_status];
                const isMutating = mutatingMemberId === member.id;
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <Text style={styles.memberMeta}>
                        {member.position?.name ?? 'Tanpa jabatan'} · {member.phone}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.memberActionBtn,
                        member.registration_status === 'blocked' ? styles.unblockBtn : styles.blockBtn,
                      ]}
                      onPress={() => handleToggleBlock(member)}
                      disabled={isMutating}
                    >
                      {isMutating ? (
                        <ActivityIndicator size="small" color={member.registration_status === 'blocked' ? COLORS.success : COLORS.danger} />
                      ) : (
                        <Text
                          style={[
                            styles.memberActionText,
                            { color: member.registration_status === 'blocked' ? COLORS.success : COLORS.danger },
                          ]}
                        >
                          {member.registration_status === 'blocked' ? 'Buka Blokir' : 'Blokir'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* ================= MODAL DAFTARKAN ANGGOTA ================= */}
      <Modal visible={registerModalVisible} transparent animationType="fade" onRequestClose={() => setRegisterModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.registerOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.registerCard}>
            <Text style={styles.registerTitle}>Daftarkan Anggota Baru</Text>
            <Text style={styles.registerSub}>
              Anggota akan mengaktivasi akunnya sendiri lewat OTP. Status awal otomatis "Belum Aktivasi".
            </Text>

            <Text style={styles.fieldLabel}>Nama Lengkap</Text>
            <View style={styles.fieldBox}>
              <TextInput
                style={styles.input}
                placeholder="Nama sesuai KTP"
                placeholderTextColor="#B7BFD1"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <Text style={styles.fieldLabel}>Nomor HP</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.ccInline}>+62</Text>
              <TextInput
                style={styles.input}
                placeholder="812-3456-7890"
                placeholderTextColor="#B7BFD1"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />
            </View>

            <Text style={styles.fieldLabel}>Jabatan</Text>
            <View style={styles.positionGrid}>
              {positions.map((position) => {
                const selected = position.id === newPositionId;
                return (
                  <Pressable
                    key={position.id}
                    style={[styles.positionChip, selected && styles.positionChipSelected]}
                    onPress={() => setNewPositionId(position.id)}
                  >
                    <Text style={[styles.positionChipText, selected && styles.positionChipTextSelected]}>
                      {position.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.registerActions}>
              <Pressable
                style={styles.registerCancelBtn}
                onPress={() => setRegisterModalVisible(false)}
                disabled={isRegistering}
              >
                <Text style={styles.registerCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.registerSubmitBtn} onPress={handleRegister} disabled={isRegistering}>
                {isRegistering ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.registerSubmitText}>Daftarkan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickActionCard} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Text style={styles.quickActionArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  fontLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },

  hero: { paddingHorizontal: 20, paddingBottom: 22 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 21, fontFamily: 'SpaceGrotesk_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  logoutBtnText: { color: '#fff', fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },

  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  loadingText: { color: COLORS.inkSoft, fontSize: 12.5, fontFamily: 'Inter_500Medium' },

  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: COLORS.ink,
    marginTop: 18,
    marginBottom: 12,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, marginBottom: 4 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11.5, color: COLORS.inkSoft },

  quickActions: { gap: 10 },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickActionIcon: { fontSize: 18 },
  quickActionLabel: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: COLORS.ink },
  quickActionArrow: { color: COLORS.bluePrimary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15 },

  membersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addMemberBtn: {
    backgroundColor: COLORS.bluePrimary,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addMemberBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },

  emptyText: { color: COLORS.inkSoft, fontFamily: 'Inter_500Medium', fontSize: 12.5, textAlign: 'center', paddingVertical: 24 },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontFamily: 'Inter_700Bold', fontSize: 13.5, color: COLORS.ink },
  memberMeta: { fontFamily: 'Inter_500Medium', fontSize: 11.5, color: COLORS.inkSoft },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3, marginTop: 2 },
  statusBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },

  memberActionBtn: {
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1.4,
    minWidth: 88,
    alignItems: 'center',
  },
  blockBtn: { borderColor: COLORS.dangerBg, backgroundColor: COLORS.dangerBg },
  unblockBtn: { borderColor: COLORS.successBg, backgroundColor: COLORS.successBg },
  memberActionText: { fontFamily: 'Inter_700Bold', fontSize: 11.5 },

  registerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,30,61,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  registerCard: { width: '100%', backgroundColor: '#fff', borderRadius: 22, padding: 22, maxHeight: '86%' },
  registerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: COLORS.ink, marginBottom: 4 },
  registerSub: { fontFamily: 'Inter_400Regular', fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 16, marginBottom: 16 },

  fieldLabel: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: COLORS.ink, marginBottom: 7 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.6,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#FBFCFF',
    marginBottom: 14,
  },
  ccInline: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.ink },
  input: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_500Medium', color: COLORS.ink, padding: 0 },

  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  positionChip: {
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#FBFCFF',
  },
  positionChipSelected: { backgroundColor: COLORS.bluePrimary, borderColor: COLORS.bluePrimary },
  positionChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.ink },
  positionChipTextSelected: { color: '#fff' },

  registerActions: { flexDirection: 'row', gap: 10 },
  registerCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1.6,
    borderColor: COLORS.line,
  },
  registerCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.inkSoft },
  registerSubmitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 100,
    backgroundColor: COLORS.bluePrimary,
  },
  registerSubmitText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#fff' },
});
