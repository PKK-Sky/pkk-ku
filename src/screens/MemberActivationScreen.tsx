/**
 * Aktivasi Mandiri Anggota (OTP).
 * Alur: cek nomor HP -> kirim & verifikasi OTP -> lengkapi alamat -> set password.
 * Sesuai kontrak RPC di docs/supabase/peta_rpc.md — lihat authService.ts untuk
 * detail tiap langkah.
 *
 * PENTING soal navigasi: begitu OTP terverifikasi, Supabase membuat session
 * aktif -> AuthContext mendeteksi isAuthenticated=true -> AppNavigator
 * MENGGANTI seluruh stack. Layar ini didaftarkan di DUA stack (unauthenticated
 * dan "needsActivation") memakai komponen yang sama, dan menentukan langkah
 * awal dari useAuthContext().isAuthenticated saat mount — supaya proses lanjut
 * mulus walau komponennya remount akibat pergantian stack itu.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '@context/AuthContext';
import {
  checkMemberByPhone,
  sendPhoneOtp,
  verifyPhoneOtp,
  completeMemberRegistration,
  setAccountPassword,
  type CheckMemberByPhoneResult,
} from '@services';
import { normalizePhoneToE164, stripPhoneInput } from '@utils/phone';

const COLORS = {
  bluePrimary: '#1D63ED',
  teal: '#0FB5A6',
  text: '#101828',
  textMuted: '#667085',
  border: '#D0D5DD',
  bg: '#FFFFFF',
  danger: '#DC3545',
  successBg: '#E7F8F1',
  successText: '#0FA36B',
};

type Step = 'phone' | 'otp' | 'profile' | 'password' | 'done';

export default function MemberActivationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuthContext();

  // Kalau layar ini mount karena stack sudah berpindah ke "needsActivation"
  // (OTP sudah pernah diverifikasi sebelumnya di sesi ini), langsung mulai
  // dari step lengkapi profil — bukan minta nomor HP dari awal lagi.
  const [step, setStep] = useState<Step>(isAuthenticated ? 'profile' : 'phone');
  const [loading, setLoading] = useState(false);

  const [phoneInput, setPhoneInput] = useState('');
  const [checkedMember, setCheckedMember] = useState<CheckMemberByPhoneResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Nomor E.164 aktif: dari input (sebelum login) atau dari session (setelah OTP,
  // supaya tidak bergantung pada state lokal yang bisa hilang saat remount).
  const phoneE164 = useMemo(() => {
    if (user?.phone) {
      return user.phone.startsWith('+') ? user.phone : `+${user.phone}`;
    }
    return normalizePhoneToE164(phoneInput);
  }, [user?.phone, phoneInput]);

  const handleCheckPhone = useCallback(async () => {
    const normalized = normalizePhoneToE164(phoneInput);
    if (!normalized) {
      Alert.alert('Nomor Tidak Valid', 'Masukkan nomor HP yang benar, minimal 8 digit.');
      return;
    }
    setLoading(true);
    const { data, error } = await checkMemberByPhone(normalized);
    setLoading(false);

    if (error) {
      Alert.alert('Gagal Memeriksa Nomor', error.message);
      return;
    }
    if (!data?.found) {
      Alert.alert('Nomor Tidak Ditemukan', data?.message ?? 'Nomor HP ini belum terdaftar sebagai anggota. Hubungi admin untuk didaftarkan terlebih dahulu.');
      return;
    }
    if (data.blocked) {
      Alert.alert('Akun Diblokir', data.message ?? 'Akun anggota ini sedang diblokir. Hubungi admin.');
      return;
    }
    if (data.already_registered) {
      Alert.alert(
        'Sudah Aktivasi',
        data.message ?? 'Nomor ini sudah pernah aktivasi. Silakan login langsung.',
        [{ text: 'Ke Halaman Login', onPress: () => navigation.navigate('Login') }]
      );
      return;
    }

    setCheckedMember(data);
    setLoading(true);
    const { error: otpError } = await sendPhoneOtp(normalized);
    setLoading(false);
    if (otpError) {
      Alert.alert('Gagal Mengirim OTP', otpError.message);
      return;
    }
    setStep('otp');
  }, [phoneInput, navigation]);

  const handleVerifyOtp = useCallback(async () => {
    if (!phoneE164) return;
    if (otpCode.trim().length < 4) {
      Alert.alert('Kode OTP Tidak Valid', 'Masukkan kode OTP yang dikirim lewat SMS.');
      return;
    }
    setLoading(true);
    const { error } = await verifyPhoneOtp(phoneE164, otpCode.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Verifikasi Gagal', error.message);
      return;
    }
    // Sukses -> session aktif, AppNavigator akan swap stack. State komponen ini
    // akan hilang, tapi remount berikutnya (di stack "needsActivation") akan
    // otomatis mulai dari step 'profile' (lihat useState di atas) dan phoneE164
    // akan terisi lagi dari session.user.phone.
  }, [phoneE164, otpCode]);

  const handleResendOtp = useCallback(async () => {
    if (!phoneE164) return;
    setLoading(true);
    const { error } = await sendPhoneOtp(phoneE164);
    setLoading(false);
    if (error) {
      Alert.alert('Gagal Mengirim Ulang', error.message);
      return;
    }
    Alert.alert('Terkirim', 'Kode OTP baru sudah dikirim.');
  }, [phoneE164]);

  const handleCompleteProfile = useCallback(async () => {
    if (!phoneE164) {
      Alert.alert('Sesi Tidak Valid', 'Nomor HP tidak ditemukan di sesi Anda. Silakan ulangi dari awal.');
      return;
    }
    setLoading(true);
    const { data, error } = await completeMemberRegistration(phoneE164, address.trim() || null, null);
    setLoading(false);
    if (error || !data?.success) {
      Alert.alert('Gagal Melengkapi Profil', error?.message ?? 'Terjadi kesalahan. Coba lagi.');
      return;
    }
    setStep('password');
  }, [phoneE164, address]);

  const handleSetPassword = useCallback(async () => {
    if (password.length < 6) {
      Alert.alert('Password Terlalu Pendek', 'Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Tidak Cocok', 'Konfirmasi password harus sama persis.');
      return;
    }
    setLoading(true);
    const { error } = await setAccountPassword(password);
    setLoading(false);
    if (error) {
      Alert.alert('Gagal Menyimpan Password', error.message);
      return;
    }
    setStep('done');
    // AuthContext akan otomatis mendeteksi member sudah linked (needsActivation
    // -> false) pada refresh berikutnya. Untuk pengalaman instan, arahkan user
    // secara eksplisit — AppNavigator akan tetap jadi sumber kebenaran routing.
  }, [password, confirmPassword]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Aktivasi Akun Anggota</Text>
        <Text style={styles.subtitle}>
          {step === 'phone' && 'Masukkan nomor HP yang sudah didaftarkan oleh admin.'}
          {step === 'otp' && `Masukkan kode OTP yang dikirim ke ${phoneE164}.`}
          {step === 'profile' && `Selamat datang, ${checkedMember?.full_name ?? ''}! Lengkapi alamat Anda (opsional).`}
          {step === 'password' && 'Buat password untuk login selanjutnya.'}
          {step === 'done' && 'Aktivasi selesai!'}
        </Text>

        {step === 'phone' && (
          <>
            <Text style={styles.label}>Nomor HP</Text>
            <TextInput
              style={styles.input}
              placeholder="812-3456-7890"
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={(t) => setPhoneInput(stripPhoneInput(t))}
              maxLength={15}
            />
            <PrimaryButton label="Cek Nomor" onPress={handleCheckPhone} loading={loading} />
          </>
        )}

        {step === 'otp' && (
          <>
            {checkedMember?.full_name ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardText}>
                  {checkedMember.full_name} — {checkedMember.position_name ?? 'Anggota'}
                </Text>
              </View>
            ) : null}
            <Text style={styles.label}>Kode OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={8}
            />
            <PrimaryButton label="Verifikasi" onPress={handleVerifyOtp} loading={loading} />
            <Pressable onPress={handleResendOtp} disabled={loading} hitSlop={8} style={styles.linkRow}>
              <Text style={styles.link}>Kirim ulang kode OTP</Text>
            </Pressable>
          </>
        )}

        {step === 'profile' && (
          <>
            <Text style={styles.label}>Alamat (opsional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Alamat lengkap"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.noteText}>
              Unggah foto profil belum tersedia di langkah ini — bisa dilengkapi menyusul dari halaman profil.
            </Text>
            <PrimaryButton label="Lanjut" onPress={handleCompleteProfile} loading={loading} />
          </>
        )}

        {step === 'password' && (
          <>
            <Text style={styles.label}>Password Baru</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 6 karakter"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Ulangi password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <PrimaryButton label="Selesaikan Aktivasi" onPress={handleSetPassword} loading={loading} />
          </>
        )}

        {step === 'done' && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>
              Akun Anda sudah aktif. Aplikasi akan membawa Anda ke halaman utama sebentar lagi.
            </Text>
          </View>
        )}

        {step === 'phone' && (
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={styles.linkRow}>
            <Text style={styles.link}>Sudah punya password? Login di sini</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PrimaryButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  noteText: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, fontStyle: 'italic' },
  button: {
    backgroundColor: COLORS.bluePrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  link: { color: COLORS.bluePrimary, fontSize: 13, fontWeight: '600' },
  infoCard: {
    backgroundColor: COLORS.successBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  infoCardText: { color: COLORS.successText, fontWeight: '600' },
  successCard: {
    backgroundColor: COLORS.successBg,
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  successText: { color: COLORS.successText, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
