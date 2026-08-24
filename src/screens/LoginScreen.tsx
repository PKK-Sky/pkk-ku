import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMemberLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Nomor HP dan password wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        phone: phone.trim(),
        password: password.trim(),
      });
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Login Gagal', err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
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
              <Text style={styles.inputLabel}>Nomor HP</Text>
              <TextInput
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleMemberLogin}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Memuat...' : 'Masuk Sebagai Anggota'}
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
