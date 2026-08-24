import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/app';

type Props = NativeStackScreenProps<RootStackParamList, 'AccessDenied'>;

export default function AccessDeniedScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🚫</Text>
        <Text style={styles.emptyTitle}>Akses Tidak Diizinkan</Text>
        <Text style={styles.emptyText}>
          Maaf, jabatan Anda tidak memiliki izin untuk mengakses fitur ini. Hanya Bendahara, Sekretaris, dan Pokja I–IV yang dapat membuat laporan.
        </Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.btnPrimaryText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, textAlign: 'center',
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: COLORS.text },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btnPrimary: {
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
