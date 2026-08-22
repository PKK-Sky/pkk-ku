// src/screens/LoginScreen.tsx
// Layar login "My PKK Warakas" untuk Expo / React Native.
// Terintegrasi penuh dengan Supabase: RPC check_member_by_phone & Auth admin.
//
// Dependensi:
//   npx expo install expo-linear-gradient @expo/vector-icons
//   npx expo install @expo-google-fonts/baloo-2 @expo-google-fonts/plus-jakarta-sans expo-font expo-splash-screen

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Baloo2_700Bold, Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// -----------------------------------------------------------------------
// Palet warna tosca
// -----------------------------------------------------------------------
const colors = {
  toscaDeep: '#0B5D59',
  tosca: '#0E8A82',
  toscaBright: '#1FBAA8',
  toscaSoft: '#E4F6F2',
  ink: '#0B2B29',
  inkSoft: '#5C7B77',
  line: '#DCEEEA',
  white: '#FFFFFF',
  errorBg: '#FDECEC',
  errorText: '#9A2A2A',
};

type Status = { kind: 'info' | 'error' | 'success'; text: string } | null;

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const { setSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // -------------------------------------------------------------
  // Validasi & normalisasi nomor HP
  // -------------------------------------------------------------
  const normalizePhone = (raw: string): string => {
    let cleaned = raw.trim().replace(/\D/g, '');
    if (cleaned.startsWith('62')) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    return cleaned;
  };

  // -------------------------------------------------------------
  // Submit nomor HP -> RPC check_member_by_phone
  // -------------------------------------------------------------
  const handleSubmitPhone = useCallback(async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9 || normalized.length > 12) {
      setStatus({ kind: 'error', text: 'Masukkan nomor HP yang valid (9-12 digit).' });
      return;
    }

    setLoading(true);
    setStatus({ kind: 'info', text: 'Menghubungkan ke sistem keanggotaan…' });

    try {
      const fullPhone = '0' + normalized;

      const { data, error } = await supabase.rpc('check_member_by_phone', {
        p_phone: fullPhone,
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error('Gagal menghubungi server. Coba lagi nanti.');
      }

      if (!data?.found) {
        setStatus({ kind: 'error', text: data?.message ?? 'Nomor tidak ditemukan dalam data keanggotaan.' });
        return;
      }

      if (data.blocked) {
        setStatus({ kind: 'error', text: data.message ?? 'Akun ini diblokir. Hubungi pengurus.' });
        return;
      }

      if (data.already_registered) {
        // Anggota sudah daftar → arahkan ke layar OTP-login
        setStatus({ kind: 'success', text: 'Nomor ditemukan. Mengalihkan ke verifikasi…' });
        setTimeout(() => {
          navigation.navigate('OtpVerify', {
            phone: fullPhone,
            mode: 'login',
            memberData: {
              full_name: data.full_name,
              position_name: data.position_name,
            },
          });
        }, 600);
        return;
      }

      // Anggota belum daftar → arahkan ke layar lengkapi profil + OTP
      setStatus({ kind: 'success', text: 'Nomor ditemukan. Lengkapi pendaftaran…' });
      setTimeout(() => {
        navigation.navigate('OtpVerify', {
          phone: fullPhone,
          mode: 'register',
          memberData: {
            full_name: data.full_name,
            position_name: data.position_name,
          },
        });
      }, 600);
    } catch (err: any) {
      console.error('Phone submit error:', err);
      setStatus({ kind: 'error', text: err?.message ?? 'Terjadi kesalahan. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  }, [phone, navigation]);

  // -------------------------------------------------------------
  // Submit login admin -> supabase.auth.signInWithPassword
  // -------------------------------------------------------------
  const handleAdminSubmit = useCallback(async () => {
    if (!adminEmail.trim() || !adminPassword) {
      Alert.alert('Data belum lengkap', 'Email dan kata sandi wajib diisi.');
      return;
    }

    setAdminLoading(true);
    setStatus(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email atau kata sandi salah.');
        }
        throw error;
      }

      if (data.session) {
        setSession(data.session);
        setAdminModalOpen(false);
        setAdminEmail('');
        setAdminPassword('');
        // Navigation ke dashboard admin ditangani oleh AuthContext / Navigator
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      Alert.alert('Gagal Masuk', err?.message ?? 'Terjadi kesalahan saat login.');
    } finally {
      setAdminLoading(false);
    }
  }, [adminEmail, adminPassword, setSession]);

  // -------------------------------------------------------------
  // Loading font
  // -------------------------------------------------------------
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.tosca} />
        <Text style={styles.loadingText}>Memuat…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Blob ambient */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />

      {/* Tombol akses admin */}
      <Pressable
        style={({ pressed }) => [styles.adminBtn, pressed && styles.adminBtnPressed]}
        onPress={() => setAdminModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Masuk sebagai admin"
        hitSlop={8}
      >
        <Ionicons name="headset-outline" size={20} color={colors.inkSoft} />
      </Pressable>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.stage}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>My PKK Warakas</Text>
            <Text style={styles.appTagline}>Warga Aktif, Keluarga Sejahtera</Text>

            {status && (
              <View
                style={[
                  styles.statusMsg,
                  status.kind === 'error'
                    ? styles.statusError
                    : status.kind === 'success'
                    ? styles.statusSuccess
                    : styles.statusInfo,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        status.kind === 'error'
                          ? colors.errorText
                          : status.kind === 'success'
                          ? colors.toscaDeep
                          : colors.toscaDeep,
                    },
                  ]}
                >
                  {status.text}
                </Text>
              </View>
            )}

            <View style={styles.phonePill}>
              <Text style={styles.phonePrefix}>+62</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="812-xxxx-xxxx"
                placeholderTextColor="#9FB8B4"
                keyboardType="number-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={phone}
                onChangeText={setPhone}
                maxLength={13}
                editable={!loading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimaryWrap,
                (pressed || loading) && { opacity: 0.9 },
              ]}
              onPress={handleSubmitPhone}
              disabled={loading}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.tosca, colors.toscaBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPrimary}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Lanjutkan</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.helperRow}>
              Nomor sudah didaftarkan pengurus?{' '}
              <Text
                style={styles.helperLink}
                onPress={() =>
                  navigation.navigate('OtpVerify', { mode: 'register', phone: '' })
                }
              >
                Buat akun
              </Text>
            </Text>

            <Text style={styles.footNote}>Tim Penggerak PKK · Kelurahan Warakas</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODAL ADMIN ================= */}
      <Modal
        visible={adminModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAdminModalOpen(false);
          setAdminEmail('');
          setAdminPassword('');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setAdminModalOpen(false);
            setAdminEmail('');
            setAdminPassword('');
          }}
        >
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setAdminModalOpen(false);
                setAdminEmail('');
                setAdminPassword('');
              }}
              accessibilityLabel="Tutup"
            >
              <Ionicons name="close" size={16} color={colors.toscaDeep} />
            </Pressable>

            <Text style={styles.modalEyebrow}>AKSES PENGURUS</Text>
            <Text style={styles.modalTitle}>Masuk sebagai admin</Text>
            <Text style={styles.modalDesc}>
              Khusus pengurus dengan hak kelola data anggota, pengumuman, dan laporan.
            </Text>

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="admin@pkkwarakas.id"
              placeholderTextColor="#9FB8B4"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              value={adminEmail}
              onChangeText={setAdminEmail}
              editable={!adminLoading}
            />

            <Text style={styles.modalLabel}>Kata sandi</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#9FB8B4"
                secureTextEntry={!showAdminPassword}
                textContentType="password"
                value={adminPassword}
                onChangeText={setAdminPassword}
                editable={!adminLoading}
              />
              <Pressable
                onPress={() => setShowAdminPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showAdminPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                <Ionicons
                  name={showAdminPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.inkSoft}
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnAdmin,
                (pressed || adminLoading) && { opacity: 0.9 },
              ]}
              onPress={handleAdminSubmit}
              disabled={adminLoading}
            >
              {adminLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnAdminText}>Masuk sebagai admin</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  blobA: {
    width: 300,
    height: 300,
    top: -110,
    left: -100,
    backgroundColor: colors.toscaBright,
  },
  blobB: {
    width: 280,
    height: 280,
    bottom: -110,
    right: -90,
    backgroundColor: colors.tosca,
  },
  adminBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 50,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.toscaDeep,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  adminBtnPressed: {
    backgroundColor: colors.toscaSoft,
  },
  stage: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  authCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 4,
  },
  appName: {
    fontFamily: 'Baloo2_700Bold',
    fontSize: 23,
    color: colors.toscaDeep,
    marginBottom: 2,
  },
  appTagline: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13.5,
    color: colors.inkSoft,
    marginBottom: 28,
  },
  statusMsg: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  statusInfo: { backgroundColor: colors.toscaSoft },
  statusError: { backgroundColor: colors.errorBg },
  statusSuccess: { backgroundColor: '#E8F5E9' },
  statusText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: '#FAFDFC',
    paddingLeft: 20,
    marginBottom: 14,
  },
  phonePrefix: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14.5,
    color: colors.ink,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 15,
    paddingRight: 20,
    paddingLeft: 6,
  },
  btnPrimaryWrap: {
    width: '100%',
    marginTop: 4,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.tosca,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  btnPrimaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    marginHorizontal: 12,
  },
  helperRow: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13.5,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  helperLink: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.tosca,
  },
  footNote: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: '#9FB8B4',
    marginTop: 36,
  },
  // ---- modal ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,43,41,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 26,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.toscaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.tosca,
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 19,
    color: colors.ink,
    marginBottom: 6,
  },
  modalDesc: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 6,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 14,
  },
  passwordWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    marginBottom: 14,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  btnAdmin: {
    width: '100%',
    backgroundColor: colors.toscaDeep,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnAdminText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.white,
  },
});
