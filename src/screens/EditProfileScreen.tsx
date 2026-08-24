import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.user.id)
      .single();
    if (data) {
      setFullName(data.full_name);
      setPhone(data.phone);
      setAddress(data.address || '');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Nama dan nomor HP wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('members')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
        })
        .eq('user_id', user.user?.id);
      if (error) throw error;
      Alert.alert('Sukses', 'Profil diperbarui', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
            <Text style={styles.topbarIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topbarTitle}>Edit Profil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama Lengkap</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nomor HP</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alamat</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline numberOfLines={3} value={address} onChangeText={setAddress} />
          </View>

          <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleSave} disabled={loading}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  topbar: {
    backgroundColor: COLORS.white, padding: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  topbarIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  topbarIconText: { fontSize: 18, color: COLORS.primary },
  topbarTitle: { fontSize: 17, fontWeight: '700' },
  form: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    width: '100%', padding: 14, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: 12, fontSize: 15, backgroundColor: COLORS.white,
  },
  btnPrimary: {
    width: '100%', padding: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
