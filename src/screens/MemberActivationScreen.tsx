import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import {
  findMembersByName,
  claimMemberEmail,
  sendEmailOtp,
  verifyEmailOtp,
  completeMemberRegistrationByEmail,
  setAccountPassword,
  signOut,
  type MemberNameCandidate,
} from '../services/authService';
import { isValidEmail } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberActivation'>;

type Step = 'name' | 'candidates' | 'email' | 'otp' | 'complete';

export default function MemberActivationScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [loading, setLoading] = useState(false);

  // Step "name"
  const [fullName, setFullName] = useState('');
  const [candidates, setCandidates] = useState<MemberNameCandidate[]>([]);

  // Data anggota yang sudah dikonfirmasi (hasil find_members_by_name)
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [positionName, setPositionName] = useState('');

  // Step "email" / "otp"
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const otpRef = useRef<TextInput>(null);

  // Step "complete"
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const stepIndex = (['name', 'email', 'otp', 'complete'] as const).indexOf(
    step === 'candidates' ? 'name' : step
  );

  const selectCandidate = (candidate: MemberNameCandidate) => {
    setMemberId(candidate.id);
    setMemberName(candidate.full_name);
    setPositionName(candidate.position_name);
    setStep('email');
  };

  // Step 1: Cek nama lengkap
  const handleCheckName = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Nama lengkap wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await findMembersByName(fullName.trim());
      if (error) throw error;
      if (!data?.found) {
        Alert.alert(
          'Tidak Ditemukan',
          data?.message || 'Nama belum terdaftar oleh admin, atau akun sudah diaktivasi. Hubungi admin.'
        );
        return;
      }
      if (data.ambiguous) {
        setCandidates(data.candidates || []);
        setStep('candidates');
        return;
      }
      setMemberId(data.member_id || '');
      setMemberName(data.full_name || '');
      setPositionName(data.position_name || '');
      setStep('email');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memeriksa nama');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Simpan email lalu kirim OTP
  const handleSubmitEmail = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Masukkan alamat email yang valid');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: claimError } = await claimMemberEmail(memberId, normalizedEmail);
      if (claimError) throw claimError;

      const { error: otpError } = await sendEmailOtp(normalizedEmail);
      if (otpError) throw otpError;

      setEmail(normalizedEmail);
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan email / mengirim OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verifikasi OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Masukkan 6 digit kode OTP');
      return;
    }
    setLoading(true);
    try {
      const { error } = await verifyEmailOtp(email, otp);
      if (error) throw error;
      setStep('complete');
    } catch (err: any) {
      Alert.alert('Verifikasi Gagal', err.message || 'Kode OTP salah');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await sendEmailOtp(email);
      if (error) throw error;
      Alert.alert('Sukses', 'Kode OTP baru telah dikirim ke email Anda');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Lengkapi registrasi + set password, lalu balik ke Login
  const handleComplete = async () => {
    if (password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }
    setLoading(true);
    try {
      const { error: completeError } = await completeMemberRegistrationByEmail(
        email,
        address || null,
        null
      );
      if (completeError) throw completeError;

      const { error: passwordError } = await setAccountPassword(password);
      if (passwordError) throw passwordError;

      // Sengaja sign out setelah aktivasi selesai, supaya anggota login ulang
      // dari awal pakai email + password yang baru saja dibuat.
      await signOut();

      Alert.alert(
        'Aktivasi Berhasil',
        'Akun Anda telah diaktivasi. Silakan login menggunakan email dan password yang baru dibuat.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyelesaikan aktivasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => (step === 'name' ? navigation.goBack() : setStep('name'))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Aktivasi Akun</Text>
        <Text style={styles.subtitle}>
          {step === 'name' && 'Masukkan nama lengkap sesuai data yang didaftarkan admin'}
          {step === 'candidates' && 'Ditemukan lebih dari satu data dengan nama ini, pilih data Anda'}
          {step === 'email' && 'Masukkan email aktif Anda untuk menerima kode OTP'}
          {step === 'otp' && `Masukkan kode OTP yang dikirim ke ${email}`}
          {step === 'complete' && 'Lengkapi data & buat password Anda'}
        </Text>

        {/* Progress indicator */}
        {step !== 'candidates' && (
          <View style={styles.progress}>
            {(['name', 'email', 'otp', 'complete'] as const).map((s, i) => (
              <View key={s} style={styles.progressRow}>
                <View
                  style={[
                    styles.progressDot,
                    i <= stepIndex && styles.progressDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressDotText,
                      i <= stepIndex && styles.progressDotTextActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                {i < 3 && <View style={[styles.progressLine, i < stepIndex && styles.progressLineDone]} />}
              </View>
            ))}
          </View>
        )}

        {step === 'name' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama lengkap sesuai pendaftaran"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleCheckName}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Memeriksa...' : 'Lanjut'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'candidates' && (
          <View style={styles.form}>
            {candidates.map(candidate => (
              <TouchableOpacity
                key={candidate.id}
                style={styles.candidateCard}
                onPress={() => selectCandidate(candidate)}
              >
                <Text style={styles.infoText}>Nama: {candidate.full_name}</Text>
                <Text style={styles.infoText}>Jabatan: {candidate.position_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'email' && (
          <View style={styles.form}>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>Nama: {memberName}</Text>
              <Text style={styles.infoText}>Jabatan: {positionName}</Text>
              <Text style={styles.infoSub}>Konfirmasi data di atas sebelum lanjut</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleSubmitEmail}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kode OTP (6 digit)</Text>
              <TextInput
                ref={otpRef}
                style={[styles.input, styles.otpInput]}
                placeholder="______"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                textAlign="center"
              />
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Memverifikasi...' : 'Verifikasi'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resendOtp} disabled={loading} style={styles.resendBtn}>
              <Text style={styles.resendText}>Kirim Ulang OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'complete' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat Lengkap (opsional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Jl. Warakas VII No. 12, RT.003/RW.007"
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Minimal 6 karakter"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Konfirmasi Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Ulangi password"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(prev => !prev)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Menyimpan...' : 'Selesaikan Aktivasi'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  backText: { fontSize: 18, color: COLORS.text },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 24 },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  progressDotTextActive: { color: COLORS.white },
  progressLine: { width: 32, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: COLORS.primary },
  form: { marginTop: 8 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: COLORS.white,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: { fontSize: 24, letterSpacing: 12, fontWeight: '700' },
  btnPrimary: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  infoCard: {
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  candidateCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
