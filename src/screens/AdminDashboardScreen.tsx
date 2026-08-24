import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  usePositions,
  useAdminMembers,
  useAdminReports,
  useAdminAnnouncements,
} from '@hooks';
import { supabaseUrl } from '@lib/supabase';
import { getPublicUrl } from '@constants';
import { formatTimeAgo } from '@utils';
import type {
  MemberWithPosition,
  RegistrationStatus,
  ReportWithDetails,
  ReportStatus,
  Announcement,
} from '@types';

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  gold: '#FFC629',
  teal: '#22D3B5',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  danger: '#D92D20',
  success: '#0F9D65',
};

const MEMBER_STATUS_META: Record<RegistrationStatus, { label: string; bg: string; fg: string }> = {
  active: { label: 'Aktif', bg: '#E5F9F1', fg: COLORS.success },
  pending: { label: 'Menunggu Aktivasi', bg: '#FFF6E0', fg: '#B7791F' },
  inactive: { label: 'Nonaktif', bg: '#EEF0F6', fg: COLORS.inkSoft },
  rejected: { label: 'Ditolak', bg: '#FDECEC', fg: COLORS.danger },
};

const REPORT_STATUS_META: Record<ReportStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: 'Draf', bg: '#EEF0F6', fg: COLORS.inkSoft },
  submitted: { label: 'Terkirim', bg: '#E7F0FF', fg: COLORS.bluePrimary },
  approved: { label: 'Disetujui', bg: '#E5F9F1', fg: COLORS.success },
  rejected: { label: 'Ditolak', bg: '#FDECEC', fg: COLORS.danger },
};

type TabKey = 'ringkasan' | 'anggota' | 'laporan' | 'pengumuman';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ringkasan', label: 'Ringkasan', icon: 'grid-outline' },
  { key: 'anggota', label: 'Anggota', icon: 'people-outline' },
  { key: 'laporan', label: 'Laporan', icon: 'document-text-outline' },
  { key: 'pengumuman', label: 'Pengumuman', icon: 'megaphone-outline' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const positionsState = usePositions();
  const membersState = useAdminMembers();
  const reportsState = useAdminReports();
  const announcementsState = useAdminAnnouncements();

  const [activeTab, setActiveTab] = useState<TabKey>('ringkasan');
  const [refreshing, setRefreshing] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');

  // Modal: daftarkan anggota baru
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPositionId, setNewPositionId] = useState<string | null>(null);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // Modal: aksi anggota (ubah jabatan/status/hapus)
  const [selectedMember, setSelectedMember] = useState<MemberWithPosition | null>(null);

  // Modal: buat pengumuman
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);

  // Modal: detail laporan
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);

  const handleLogout = useCallback(() => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun admin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      membersState.refetch(),
      reportsState.refetch(),
      announcementsState.refetch(),
      positionsState.refetch(),
    ]);
    setRefreshing(false);
  }, [membersState, reportsState, announcementsState, positionsState]);

  // ---- Ringkasan ----
  const stats = useMemo(() => {
    const totalMembers = membersState.members.length;
    const activeMembers = membersState.members.filter((m) => m.registration_status === 'active').length;
    const pendingMembers = membersState.members.filter((m) => m.registration_status === 'pending').length;
    const totalReports = reportsState.reports.length;
    const now = new Date();
    const reportsThisMonth = reportsState.reports.filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const activeAnnouncements = announcementsState.announcements.filter((a) => a.is_active).length;
    return { totalMembers, activeMembers, pendingMembers, totalReports, reportsThisMonth, activeAnnouncements };
  }, [membersState.members, reportsState.reports, announcementsState.announcements]);

  // ---- Anggota ----
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return membersState.members;
    return membersState.members.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [membersState.members, memberSearch]);

  const resetRegisterForm = useCallback(() => {
    setNewFullName('');
    setNewPhone('');
    setNewAddress('');
    setNewPositionId(null);
  }, []);

  const handleRegisterMember = useCallback(async () => {
    if (!newFullName.trim() || !newPhone.trim() || !newPositionId) {
      Alert.alert('Data Belum Lengkap', 'Nama, nomor HP, dan jabatan wajib diisi.');
      return;
    }
    setRegisterSubmitting(true);
    const result = await membersState.create({
      full_name: newFullName.trim(),
      phone: newPhone.trim(),
      position_id: newPositionId,
      address: newAddress.trim() || undefined,
    });
    setRegisterSubmitting(false);
    if (result.success) {
      setRegisterModalVisible(false);
      resetRegisterForm();
      Alert.alert(
        'Berhasil',
        'Anggota baru terdaftar. Sampaikan nomor HP ini ke yang bersangkutan untuk melakukan aktivasi (verifikasi + set password) sendiri.'
      );
    } else {
      Alert.alert('Gagal Mendaftarkan', result.error ?? 'Terjadi kesalahan.');
    }
  }, [newFullName, newPhone, newPositionId, newAddress, membersState, resetRegisterForm]);

  const handleChangeMemberStatus = useCallback(
    async (status: RegistrationStatus) => {
      if (!selectedMember) return;
      const result = await membersState.changeStatus(selectedMember.id, status);
      if (!result.success) {
        Alert.alert('Gagal', result.error ?? 'Terjadi kesalahan.');
        return;
      }
      setSelectedMember(null);
    },
    [selectedMember, membersState]
  );

  const handleChangeMemberPosition = useCallback(
    async (positionId: string) => {
      if (!selectedMember) return;
      const result = await membersState.changePosition(selectedMember.id, positionId);
      if (!result.success) {
        Alert.alert('Gagal', result.error ?? 'Terjadi kesalahan.');
        return;
      }
      setSelectedMember(null);
    },
    [selectedMember, membersState]
  );

  const handleDeleteMember = useCallback(() => {
    if (!selectedMember) return;
    Alert.alert(
      'Hapus Anggota',
      `Yakin ingin menghapus "${selectedMember.full_name}"? Tindakan ini tidak bisa dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const result = await membersState.remove(selectedMember.id);
            if (!result.success) {
              Alert.alert('Gagal Menghapus', result.error ?? 'Terjadi kesalahan.');
            }
            setSelectedMember(null);
          },
        },
      ]
    );
  }, [selectedMember, membersState]);

  // ---- Laporan ----
  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return reportsState.reports;
    return reportsState.reports.filter(
      (r) => r.activity_name.toLowerCase().includes(q) || r.creator_name.toLowerCase().includes(q)
    );
  }, [reportsState.reports, reportSearch]);

  const handleDeleteReport = useCallback(
    (report: ReportWithDetails) => {
      Alert.alert('Hapus Laporan', `Hapus laporan "${report.activity_name}"?`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const result = await reportsState.remove(report.id);
            if (!result.success) {
              Alert.alert('Gagal Menghapus', result.error ?? 'Terjadi kesalahan.');
            } else {
              setSelectedReport(null);
            }
          },
        },
      ]);
    },
    [reportsState]
  );

  // ---- Pengumuman ----
  const handleCreateAnnouncement = useCallback(async () => {
    if (!newAnnMessage.trim()) {
      Alert.alert('Data Belum Lengkap', 'Isi pengumuman wajib diisi.');
      return;
    }
    setAnnouncementSubmitting(true);
    const result = await announcementsState.create({
      title: newAnnTitle.trim() || undefined,
      message: newAnnMessage.trim(),
      is_active: true,
    });
    setAnnouncementSubmitting(false);
    if (result.success) {
      setAnnouncementModalVisible(false);
      setNewAnnTitle('');
      setNewAnnMessage('');
    } else {
      Alert.alert('Gagal Membuat Pengumuman', result.error ?? 'Terjadi kesalahan.');
    }
  }, [newAnnTitle, newAnnMessage, announcementsState]);

  const handleToggleAnnouncement = useCallback(
    async (announcement: Announcement) => {
      const result = await announcementsState.toggleActive(announcement.id, !announcement.is_active);
      if (!result.success) {
        Alert.alert('Gagal', result.error ?? 'Terjadi kesalahan.');
      }
    },
    [announcementsState]
  );

  const handleDeleteAnnouncement = useCallback(
    (announcement: Announcement) => {
      Alert.alert('Hapus Pengumuman', `Hapus pengumuman "${announcement.title ?? 'ini'}"?`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const result = await announcementsState.remove(announcement.id);
            if (!result.success) {
              Alert.alert('Gagal Menghapus', result.error ?? 'Terjadi kesalahan.');
            }
          },
        },
      ]);
    },
    [announcementsState]
  );

  return (
    <View style={styles.root}>
      {/* ================= HEADER ================= */}
      <LinearGradient
        colors={[COLORS.blueDeep, '#152A52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerEyebrow}>PKK Warakas</Text>
            <Text style={styles.headerTitle}>Dashboard Admin</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={handleLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={15} color={active ? COLORS.blueDeep : '#fff'} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.bluePrimary} />
        }
      >
        {/* ================= TAB: RINGKASAN ================= */}
        {activeTab === 'ringkasan' && (
          <View style={styles.section}>
            <View style={styles.statGrid}>
              <View style={[styles.statCard, { backgroundColor: COLORS.bluePrimary }]}>
                <Ionicons name="people" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.totalMembers}</Text>
                <Text style={styles.statLabel}>Total Anggota</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.activeMembers}</Text>
                <Text style={styles.statLabel}>Anggota Aktif</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#B7791F' }]}>
                <Ionicons name="time" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.pendingMembers}</Text>
                <Text style={styles.statLabel}>Menunggu Aktivasi</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.teal }]}>
                <Ionicons name="document-text" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.totalReports}</Text>
                <Text style={styles.statLabel}>Total Laporan</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.blueDeep }]}>
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.reportsThisMonth}</Text>
                <Text style={styles.statLabel}>Laporan Bulan Ini</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.gold }]}>
                <Ionicons name="megaphone" size={18} color="#fff" />
                <Text style={styles.statValue}>{stats.activeAnnouncements}</Text>
                <Text style={styles.statLabel}>Pengumuman Aktif</Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB: ANGGOTA ================= */}
        {activeTab === 'anggota' && (
          <View style={styles.section}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color="#9AA3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau nomor HP..."
                placeholderTextColor="#B7BFD1"
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setRegisterModalVisible(true)}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Daftarkan Anggota Baru</Text>
            </Pressable>

            {membersState.isLoading ? (
              <ActivityIndicator color={COLORS.bluePrimary} style={{ marginVertical: 24 }} />
            ) : filteredMembers.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada anggota terdaftar.</Text>
            ) : (
              filteredMembers.map((member) => {
                const statusMeta = MEMBER_STATUS_META[member.registration_status];
                return (
                  <Pressable
                    key={member.id}
                    style={styles.memberRow}
                    onPress={() => setSelectedMember(member)}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{getInitials(member.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <Text style={styles.memberMeta}>
                        {member.phone} • {member.position?.name ?? '—'}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.statusChipText, { color: statusMeta.fg }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ================= TAB: LAPORAN ================= */}
        {activeTab === 'laporan' && (
          <View style={styles.section}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color="#9AA3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari kegiatan atau nama pelapor..."
                placeholderTextColor="#B7BFD1"
                value={reportSearch}
                onChangeText={setReportSearch}
              />
            </View>

            {reportsState.isLoading ? (
              <ActivityIndicator color={COLORS.bluePrimary} style={{ marginVertical: 24 }} />
            ) : filteredReports.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada laporan masuk.</Text>
            ) : (
              filteredReports.map((report) => {
                const statusMeta = REPORT_STATUS_META[report.status];
                return (
                  <Pressable
                    key={report.id}
                    style={styles.reportRow}
                    onPress={() => setSelectedReport(report)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportActivity} numberOfLines={1}>
                        {report.activity_name}
                      </Text>
                      <Text style={styles.reportMeta} numberOfLines={1}>
                        {report.creator_name} • {formatTimeAgo(report.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.statusChipText, { color: statusMeta.fg }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ================= TAB: PENGUMUMAN ================= */}
        {activeTab === 'pengumuman' && (
          <View style={styles.section}>
            <Pressable style={styles.primaryButton} onPress={() => setAnnouncementModalVisible(true)}>
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Buat Pengumuman</Text>
            </Pressable>

            {announcementsState.isLoading ? (
              <ActivityIndicator color={COLORS.bluePrimary} style={{ marginVertical: 24 }} />
            ) : announcementsState.announcements.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada pengumuman.</Text>
            ) : (
              announcementsState.announcements.map((item) => (
                <View key={item.id} style={styles.announcementRow}>
                  <View style={styles.announcementRowHead}>
                    <Text style={styles.announcementRowTitle} numberOfLines={1}>
                      {item.title ?? 'Tanpa judul'}
                    </Text>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => handleToggleAnnouncement(item)}
                      trackColor={{ false: COLORS.line, true: COLORS.teal }}
                    />
                  </View>
                  <Text style={styles.announcementRowMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <View style={styles.announcementRowFooter}>
                    <Text style={styles.announcementRowTime}>{formatTimeAgo(item.created_at)}</Text>
                    <Pressable onPress={() => handleDeleteAnnouncement(item)} hitSlop={8}>
                      <Text style={styles.deleteLink}>Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL: DAFTARKAN ANGGOTA ================= */}
      <Modal
        visible={registerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegisterModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRegisterModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Daftarkan Anggota Baru</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.textField}
                placeholder="Nama lengkap"
                placeholderTextColor="#B7BFD1"
                value={newFullName}
                onChangeText={setNewFullName}
              />

              <Text style={styles.fieldLabel}>Nomor HP</Text>
              <TextInput
                style={styles.textField}
                placeholder="812-3456-7890"
                placeholderTextColor="#B7BFD1"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.fieldLabel}>Alamat (opsional)</Text>
              <TextInput
                style={styles.textField}
                placeholder="Alamat"
                placeholderTextColor="#B7BFD1"
                value={newAddress}
                onChangeText={setNewAddress}
              />

              <Text style={styles.fieldLabel}>Jabatan</Text>
              <View style={styles.chipWrap}>
                {positionsState.positions.map((pos) => (
                  <Pressable
                    key={pos.id}
                    style={[styles.chip, newPositionId === pos.id && styles.chipActive]}
                    onPress={() => setNewPositionId(pos.id)}
                  >
                    <Text
                      style={[styles.chipText, newPositionId === pos.id && styles.chipTextActive]}
                    >
                      {pos.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.primaryButton, { marginTop: 20 }]}
                onPress={handleRegisterMember}
                disabled={registerSubmitting}
              >
                {registerSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Daftarkan</Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= MODAL: AKSI ANGGOTA ================= */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedMember(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {selectedMember && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>{selectedMember.full_name}</Text>
                <Text style={styles.sheetSub}>{selectedMember.phone}</Text>

                <Text style={styles.fieldLabel}>Ubah Jabatan</Text>
                <View style={styles.chipWrap}>
                  {positionsState.positions.map((pos) => (
                    <Pressable
                      key={pos.id}
                      style={[
                        styles.chip,
                        selectedMember.position_id === pos.id && styles.chipActive,
                      ]}
                      onPress={() => handleChangeMemberPosition(pos.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedMember.position_id === pos.id && styles.chipTextActive,
                        ]}
                      >
                        {pos.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Ubah Status</Text>
                <View style={styles.chipWrap}>
                  {(Object.keys(MEMBER_STATUS_META) as RegistrationStatus[]).map((statusKey) => (
                    <Pressable
                      key={statusKey}
                      style={[
                        styles.chip,
                        selectedMember.registration_status === statusKey && styles.chipActive,
                      ]}
                      onPress={() => handleChangeMemberStatus(statusKey)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedMember.registration_status === statusKey && styles.chipTextActive,
                        ]}
                      >
                        {MEMBER_STATUS_META[statusKey].label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={styles.dangerButton} onPress={handleDeleteMember}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.dangerButtonText}>Hapus Anggota</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= MODAL: BUAT PENGUMUMAN ================= */}
      <Modal
        visible={announcementModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAnnouncementModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setAnnouncementModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Buat Pengumuman</Text>
            <Text style={styles.sheetSub}>
              Akan langsung terkirim (realtime + push) ke semua anggota aktif.
            </Text>

            <Text style={styles.fieldLabel}>Judul (opsional)</Text>
            <TextInput
              style={styles.textField}
              placeholder="Judul pengumuman"
              placeholderTextColor="#B7BFD1"
              value={newAnnTitle}
              onChangeText={setNewAnnTitle}
            />

            <Text style={styles.fieldLabel}>Isi Pengumuman</Text>
            <TextInput
              style={[styles.textField, styles.textArea]}
              placeholder="Tulis isi pengumuman..."
              placeholderTextColor="#B7BFD1"
              value={newAnnMessage}
              onChangeText={setNewAnnMessage}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={[styles.primaryButton, { marginTop: 20 }]}
              onPress={handleCreateAnnouncement}
              disabled={announcementSubmitting}
            >
              {announcementSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Kirim Pengumuman</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= MODAL: DETAIL LAPORAN ================= */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedReport(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {selectedReport && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>{selectedReport.activity_name}</Text>
                <Text style={styles.sheetSub}>
                  {selectedReport.creator_name} ({selectedReport.creator_position})
                </Text>

                {selectedReport.media?.[0] && (
                  <Image
                    source={{ uri: getPublicUrl(supabaseUrl, selectedReport.media[0].storage_path) }}
                    style={styles.reportDetailImage}
                  />
                )}

                <Text style={styles.detailLabel}>Tempat & Waktu</Text>
                <Text style={styles.detailValue}>
                  {selectedReport.activity_place} • {selectedReport.activity_date}
                </Text>

                <Text style={styles.detailLabel}>Peserta</Text>
                <Text style={styles.detailValue}>{selectedReport.participants}</Text>

                <Text style={styles.detailLabel}>Deskripsi Kegiatan</Text>
                <Text style={styles.detailValue}>{selectedReport.activity_description}</Text>

                <Pressable
                  style={styles.dangerButton}
                  onPress={() => handleDeleteReport(selectedReport)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.dangerButtonText}>Hapus Laporan</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEyebrow: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 2 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabItemActive: { backgroundColor: '#fff' },
  tabLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: COLORS.blueDeep },

  section: {},

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.ink, padding: 0 },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bluePrimary,
    borderRadius: 100,
    paddingVertical: 13,
    marginBottom: 18,
  },
  primaryButtonText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  emptyText: { fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center', marginTop: 24 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  memberName: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink },
  memberMeta: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 },

  statusChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusChipText: { fontSize: 10.5, fontWeight: '700' },

  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  reportActivity: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink },
  reportMeta: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 },

  announcementRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  announcementRowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  announcementRowTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink, flex: 1, marginRight: 10 },
  announcementRowMessage: { fontSize: 12, color: COLORS.inkSoft, marginTop: 6, lineHeight: 17 },
  announcementRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  announcementRowTime: { fontSize: 10.5, color: '#9AA3B8' },
  deleteLink: { fontSize: 11.5, color: COLORS.danger, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(11,30,61,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  sheetSub: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4, marginBottom: 16 },

  fieldLabel: { fontSize: 11.5, fontWeight: '600', color: COLORS.ink, marginTop: 14, marginBottom: 7 },
  textField: {
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: COLORS.ink,
    backgroundColor: '#FBFCFF',
  },
  textArea: { height: 90, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: COLORS.bluePrimary, borderColor: COLORS.bluePrimary },
  chipText: { fontSize: 11.5, fontWeight: '600', color: COLORS.inkSoft },
  chipTextActive: { color: '#fff' },

  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FDECEC',
    backgroundColor: '#FFF7F7',
    borderRadius: 100,
    paddingVertical: 12,
    marginTop: 20,
  },
  dangerButtonText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },

  reportDetailImage: { width: '100%', height: 180, borderRadius: 14, marginTop: 8, backgroundColor: '#F1F3F9' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.inkSoft, marginTop: 14 },
  detailValue: { fontSize: 13, color: COLORS.ink, marginTop: 4, lineHeight: 18 },
});
