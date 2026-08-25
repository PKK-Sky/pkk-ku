import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import { useAuth } from '@hooks';
import {
  saveRememberedEmail,
  getRememberedEmail,
  clearRememberedEmail,
} from '@utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { loginWithMemberEmail, isLoading } = useAuth();

  useEffect(() => {
    getRememberedEmail().then(saved => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const handleMemberLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email dan password wajib diisi');
      return;
    }
    const result = await loginWithMemberEmail(email, password);
    if (!result.success) {
      Alert.alert('Login Gagal', result.error || 'Terjadi kesalahan');
      return;
    }
    if (rememberMe) {
      await saveRememberedEmail(email.trim().toLowerCase());
    } else {
      await clearRememberedEmail();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        {/* Admin Access - Headphone Icon */}
        <TouchableOpacity
          style={styles.adminIconBtn}
          onPress={() => navigation.navigate('AdminLogin')}
        >
          <Text style={styles.adminIconText}>🎧</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Image
            source={{ uri: 'https://vmbqsogwiaqwqmjpobge.supabase.co/storage/v1/object/public/images/icon.png' }}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Selamat Datang</Text>
          <Text style={styles.subtitle}>Masuk ke akun anggota PKK Warakas</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Masukkan password"
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

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(prev => !prev)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.rememberText}>Ingat Saya</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleMemberLogin}
              disabled={isLoading}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? 'Memuat...' : 'Masuk Sebagai Anggota'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.activationLink}
              onPress={() => navigation.navigate('MemberActivation')}
            >
              <Text style={styles.activationText}>
                Klik Disini ya Bund ...Untuk aktivasi akunnya...!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9F8',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  adminIconBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  adminIconText: { fontSize: 20 },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 28 },
  form: { width: '100%' },
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  btnPrimary: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  activationLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activationText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
