import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Position } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAddMember'>;

export default function AdminAddMemberScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [positionId, setPositionId] = useState('');
  const [address, setAddress] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('positions').select('*').order('sort_order').then(({ data }) => {
      setPositions(data || []);
    });
  }, []);

  const handleSave = async () => {
    if (!fullName.trim() || !positionId) {
      Alert.alert('Error', 'Nama dan jabatan wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('members').insert({
        full_name: fullName.trim(),
        position_id: positionId,
        address: address.trim() || null,
        registration_status: 'pending',
      });
      if (error) {
        if (error.message.includes('check_position_capacity')) {
          Alert.alert('Kapasitas Penuh', 'Jabatan ini sudah mencapai batas maksimal.');
          return;
        }
        throw error;
      }
      Alert.alert('Sukses', 'Anggota berhasil didaftarkan. Status: Pending (menunggu aktivasi)', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mendaftarkan anggota');
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
        {/* Topbar */}
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
            <Text style={styles.topbarIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topbarTitle}>Tambah Anggota</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama lengkap anggota"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Jabatan</Text>
            <View style={styles.selectContainer}>
              {positions.map(pos => (
                <TouchableOpacity
                  key={pos.id}
                  style={[styles.selectItem, positionId === pos.id && styles.selectItemActive]}
                  onPress={() => setPositionId(pos.id)}
                >
                  <Text style={[styles.selectText, positionId === pos.id && styles.selectTextActive]}>
                    {pos.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alamat</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Alamat lengkap"
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Menyimpan...' : 'Simpan Anggota'}
            </Text>
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
    backgroundColor: COLORS.white,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topbarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarIconText: { fontSize: 18, color: COLORS.primary },
  topbarTitle: { fontSize: 17, fontWeight: '700' },
  form: { padding: 16 },
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
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  selectItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  selectText: { fontSize: 13, color: COLORS.textSecondary },
  selectTextActive: { color: COLORS.primary, fontWeight: '600' },
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
});
