import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Member } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase
      .from('members')
      .select('*, position:positions(*)')
      .eq('user_id', user.user.id)
      .single();
    setMember(data);
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const getInitials = (name: string = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.topbarTitle}>Profil Saya</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Text style={styles.logoutIconText}>🚪</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(member?.full_name)}</Text>
          </View>
          <Text style={styles.name}>{member?.full_name || 'Anggota'}</Text>
          <Text style={styles.role}>{member?.position?.name || 'Anggota'} · Warakas</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMASI PRIBADI</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📞</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nomor HP</Text>
              <Text style={styles.infoValue}>{member?.phone || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue}>{member?.address || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bergabung</Text>
              <Text style={styles.infoValue}>
                {member?.created_at ? new Date(member.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('EditProfile')}>
        <Text style={styles.btnOutlineText}>✏️ Edit Profil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => Alert.alert('Info', 'Fitur ganti password segera hadir')}>
        <Text style={styles.btnOutlineText}>🔒 Ganti Password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnDanger} onPress={handleLogout}>
        <Text style={styles.btnDangerText}>🚪 Keluar Akun</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 24, paddingTop: 20,
    position: 'relative', overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  logoutIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  logoutIconText: { fontSize: 18 },
  profileCard: { alignItems: 'center' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  role: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10,
  },
  infoCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoIcon: { fontSize: 18, width: 36 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  infoValue: { fontWeight: '600', fontSize: 14 },
  btnOutline: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center',
  },
  btnOutlineText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  btnDanger: {
    marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 12,
    backgroundColor: COLORS.danger, alignItems: 'center',
  },
  btnDangerText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
