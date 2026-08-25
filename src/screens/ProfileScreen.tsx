import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { RootStackParamList, Member } from '../types';
import { COLORS, STORAGE_CONFIG } from '../constants/app';
import { supabase } from '../lib/supabase';
import { setAccountPassword } from '@services';
import Avatar from '../components/Avatar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState({ reports: 0, posts: 0, chats: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const userId = user.user.id;

    const { data } = await supabase
      .from('members')
      .select('*, position:positions(*)')
      .eq('user_id', userId)
      .single();
    setMember(data);

    const now = new Date().toISOString();
    const [{ data: reports }, { data: posts }, { data: conversations }] = await Promise.all([
      supabase.from('reports').select('id').eq('created_by', userId),
      supabase.from('posts').select('id').eq('user_id', userId).gt('expires_at', now),
      supabase.from('chat_members').select('conversation_id').eq('user_id', userId),
    ]);
    setStats({
      reports: reports?.length || 0,
      posts: posts?.length || 0,
      chats: conversations?.length || 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [fetchProfile]),
  );

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const shareProfile = async () => {
    try {
      await Share.share({
        message: `${member?.full_name || 'Anggota PKK'} · ${member?.position?.name || 'Anggota'} di PKK Warakas.`,
      });
    } catch (err) {
      console.error('[Profile] gagal membagikan profil:', err);
    }
  };

  const changeAvatar = () => {
    Alert.alert('Ubah Foto Profil', 'Pilih sumber foto', [
      { text: 'Kamera', onPress: () => void pickAvatar('camera') },
      { text: 'Galeri', onPress: () => void pickAvatar('library') },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  const pickAvatar = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Aktifkan izin akses untuk mengubah foto profil.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9 });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Belum login');

      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      const path = STORAGE_CONFIG.AVATAR_PATH(userId, `avatar-${Date.now()}.jpg`);

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('members')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      setMember(prev => (prev ? { ...prev, avatar_url: urlData.publicUrl } : prev));
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Foto profil gagal diubah.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openPasswordModal = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Password Terlalu Pendek', 'Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Tidak Cocok', 'Konfirmasi password harus sama persis.');
      return;
    }
    setSavingPassword(true);
    const { error } = await setAccountPassword(newPassword);
    setSavingPassword(false);
    if (error) {
      Alert.alert('Gagal', error.message);
      return;
    }
    setPasswordModalVisible(false);
    Alert.alert('Berhasil', 'Password berhasil diperbarui.');
  };

  const menuItems: Array<{ key: string; icon: string; label: string; onPress: () => void }> = [
    { key: 'edit', icon: '✏️', label: 'Edit Profil', onPress: () => navigation.navigate('EditProfile') },
    { key: 'password', icon: '🔒', label: 'Ganti Password', onPress: openPasswordModal },
    { key: 'notif', icon: '🔔', label: 'Notifikasi & Preferensi', onPress: () => navigation.navigate('Notifications') },
    { key: 'announcement', icon: '📢', label: 'Pengumuman', onPress: () => navigation.navigate('Announcements') },
    { key: 'share', icon: '↗️', label: 'Bagikan Profil', onPress: () => void shareProfile() },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Avatar name={member?.full_name} uri={member?.avatar_url} size={96} ring />
          <TouchableOpacity style={styles.avatarEditBtn} onPress={changeAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.avatarEditIcon}>📷</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{member?.full_name || 'Anggota'}</Text>
        <Text style={styles.role}>{member?.position?.name || 'Anggota'} · PKK Warakas</Text>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('ReportList')}>
            <Text style={styles.statNumber}>{stats.reports}</Text>
            <Text style={styles.statLabel}>Laporan</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Feed')}>
            <Text style={styles.statNumber}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Postingan</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('ChatList')}>
            <Text style={styles.statNumber}>{stats.chats}</Text>
            <Text style={styles.statLabel}>Pesan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info pribadi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMASI PRIBADI</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📧</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{member?.email || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue}>{member?.address || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bergabung</Text>
              <Text style={styles.infoValue}>
                {member?.created_at ? new Date(member.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu aksi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PENGATURAN</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.btnDanger} onPress={handleLogout}>
        <Text style={styles.btnDangerText}>🚪 Keluar Akun</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ganti Password</Text>
            <Text style={styles.modalLabel}>Password Baru</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Minimal 6 karakter"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <Text style={styles.modalLabel}>Konfirmasi Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ulangi password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPasswordModalVisible(false)}
                disabled={savingPassword}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingPassword && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                <Text style={styles.modalSaveText}>{savingPassword ? 'Menyimpan...' : 'Simpan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 24, paddingTop: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarEditBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  avatarEditIcon: { fontSize: 14 },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  role: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16,
    marginTop: 20, width: '100%', paddingVertical: 12,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  statNumber: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoIcon: { fontSize: 18, width: 36 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  infoValue: { fontWeight: '600', fontSize: 14, color: COLORS.text },
  menuCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 18, width: 32 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  menuChevron: { fontSize: 20, color: COLORS.textMuted },
  btnDanger: {
    marginHorizontal: 16, marginTop: 20, padding: 14, borderRadius: 12,
    backgroundColor: COLORS.danger, alignItems: 'center',
  },
  btnDangerText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(11,30,61,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  modalCancelBtn: {
    flex: 1, padding: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  modalSaveBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  modalSaveText: { color: COLORS.white, fontWeight: '700' },
});
