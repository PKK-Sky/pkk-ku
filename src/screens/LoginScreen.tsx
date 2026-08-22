// LoginScreen.tsx
// Layar login "My PKK Warakas" untuk Expo / React Native.
// Padankan dengan RPC Supabase: check_member_by_phone, complete_member_registration.
//
// Dependensi yang perlu diinstal:
//   npx expo install expo-linear-gradient @expo/vector-icons
//   npx expo install @expo-google-fonts/baloo-2 @expo-google-fonts/plus-jakarta-sans expo-font expo-splash-screen
//
// Taruh file logo di: assets/icon.png (sudah transparan, tidak perlu diedit)

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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Baloo2_700Bold, Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

// -----------------------------------------------------------------------
// Palet warna tosca (samakan dengan token di web)
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

type Status = { kind: 'info' | 'error'; text: string } | null;

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // ---------------------------------------------------------------
  // Submit nomor HP -> panggil RPC check_member_by_phone di Supabase
  // ---------------------------------------------------------------
  const handleSubmitPhone = useCallback(async () => {
    if (phone.trim().length < 8) {
      setStatus({ kind: 'error', text: 'Masukkan nomor HP yang valid.' });
      return;
    }
    setLoading(true);
    setStatus({ kind: 'info', text: 'Menghubungkan ke sistem keanggotaan…' });

    try {
      // Ganti dengan pemanggilan nyata:
      // const { data, error } = await supabase.rpc('check_member_by_phone', {
      //   p_phone: '0' + phone.trim(),
      // });
      // if (error) throw error;
      // if (!data.found) { setStatus({ kind: 'error', text: data.message }); return; }
      // if (data.already_registered) { /* arahkan ke layar OTP-login */ return; }
      // if (data.blocked) { setStatus({ kind: 'error', text: data.message }); return; }
      // /* lanjut ke layar OTP + lengkapi profil, bawa data.full_name & data.position_name */

      await new Promise((r) => setTimeout(r, 900)); // placeholder demo
      setStatus({ kind: 'info', text: 'Nomor ditemukan. Melanjutkan ke verifikasi OTP…' });
    } catch (err: any) {
      setStatus({ kind: 'error', text: err?.message ?? 'Terjadi kesalahan. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // ---------------------------------------------------------------
  // Submit login admin -> supabase.auth.signInWithPassword
  // ---------------------------------------------------------------
  const handleAdminSubmit = useCallback(async () => {
    if (!adminEmail || !adminPassword) return;
    setAdminLoading(true);
    try {
      // const { error } = await supabase.auth.signInWithPassword({
      //   email: adminEmail,
      //   password: adminPassword,
      // });
      // if (error) throw error;
      await new Promise((r) => setTimeout(r, 700)); // placeholder demo
      setAdminModalOpen(false);
    } catch (err) {
      // tampilkan error sesuai kebutuhan
    } finally {
      setAdminLoading(false);
    }
  }, [adminEmail, adminPassword]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.tosca} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* blob ambient halus, senada dengan versi web */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />

      {/* tombol akses admin, pojok kanan atas */}
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
              source={require('./assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>My PKK Warakas</Text>
            <Text style={styles.appTagline}>Warga Aktif, Keluarga Sejahtera</Text>

            {status && (
              <View
                style={[
                  styles.statusMsg,
                  status.kind === 'error' ? styles.statusError : styles.statusInfo,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: status.kind === 'error' ? colors.errorText : colors.toscaDeep },
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
                value={phone}
                onChangeText={setPhone}
                maxLength={13}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.btnPrimaryWrap, pressed && { opacity: 0.9 }]}
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
              <Text style={styles.helperLink}>Buat akun</Text>
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
        onRequestClose={() => setAdminModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setAdminModalOpen(false)}
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
              value={adminEmail}
              onChangeText={setAdminEmail}
            />

            <Text style={styles.modalLabel}>Kata sandi</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••••••"
              placeholderTextColor="#9FB8B4"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
            />

            <Pressable
              style={({ pressed }) => [styles.btnAdmin, pressed && { opacity: 0.9 }]}
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
        </View>
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
