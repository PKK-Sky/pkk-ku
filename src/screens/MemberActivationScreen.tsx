import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberActivation'>;

type Step = 'phone' | 'otp' | 'complete';

export default function MemberActivationScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  // Step 1: Check phone
  const handleCheckPhone = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Nomor HP wajib diisi');
      return;
    }
    const formattedPhone = phone.startsWith('+') ? phone : `+62${phone.replace(/^0/, '')}`;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_member_by_phone', {
        p_phone: formattedPhone,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.found) {
        Alert.alert('Tidak Ditemukan', 'Nomor HP belum terdaftar oleh admin. Hubungi admin untuk pendaftaran.');
        return;
      }
      if (result.already_registered) {
        Alert.alert('Sudah Terdaftar', 'Akun ini sudah diaktivasi. Silakan login.');
        return;
      }
      if (result.blocked) {
        Alert.alert('Akun Diblokir', 'Akun ini telah dinonaktifkan. Hubungi admin.');
        return;
      }
      setMemberInfo(result);
      setPhone(formattedPhone);
      // Kirim OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (otpError) throw otpError;
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memeriksa nomor');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Masukkan 6 digit kode OTP');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      setStep('complete');
    } catch (err: any) {
      Alert.alert('Verifikasi Gagal', err.message || 'Kode OTP salah');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete registration
  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('complete_member_registration', {
        p_phone: phone,
        p_address: address || null,
        p_avatar_url: null,
      });
      if (error) throw error;
      Alert.alert(
        'Aktivasi Berhasil',
        'Akun Anda telah diaktivasi. Silakan login.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal melengkapi registrasi');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      Alert.alert('Sukses', 'Kode OTP baru telah dikirim');
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Aktivasi Akun</Text>
        <Text style={styles.subtitle}>
          {step === 'phone' && 'Masukkan nomor HP yang terdaftar'}
          {step === 'otp' && `Masukkan kode OTP yang dikirim ke ${phone}`}
          {step === 'complete' && 'Lengkapi data Anda'}
        </Text>

        {/* Progress indicator */}
        <View style={styles.progress}>
          {(['phone', 'otp', 'complete'] as Step[]).map((s, i) => (
            <View key={s} style={styles.progressRow}>
              <View style={[styles.progressDot, step === s && styles.progressDotActive, 
                (['otp','complete'].includes(step) && i === 0) || (step === 'complete' && i <= 1) ? styles.progressDotDone : {}]}>
                <Text style={[styles.progressDotText, (step === s || (i < ['phone','otp','complete'].indexOf(step) + (step === 'phone' ? 0 : step === 'otp' ? 1 : 2))) && styles.progressDotTextActive]}>
                  {i + 1}
                </Text>
              </View>
              {i < 2 && <View style={[styles.progressLine, (step === 'otp' && i === 0) || step === 'complete' ? styles.progressLineDone : {}]} />}
            </View>
          ))}
        </View>

        {step === 'phone' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor HP</Text>
              <TextInput
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            {memberInfo && (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>Nama: {memberInfo.full_name}</Text>
                <Text style={styles.infoText}>Jabatan: {memberInfo.position_name}</Text>
                <Text style={styles.infoSub}>Konfirmasi data di atas sebelum lanjut</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleCheckPhone}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Memeriksa...' : 'Lanjut ke OTP'}
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
  progressDotDone: { backgroundColor: COLORS.primary },
  progressDotText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  progressDotTextActive: { color: COLORS.white },
  progressLine: { width: 40, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
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
  infoText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
