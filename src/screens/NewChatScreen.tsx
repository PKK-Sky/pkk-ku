import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Member } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'NewChat'>;

export default function NewChatScreen({ navigation }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data: user } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('members')
      .select('*, position:positions(*)')
      .eq('registration_status', 'active')
      .neq('user_id', user.user?.id);
    setMembers(data || []);
  };

  const startChat = async (otherUserId: string, name: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_chat', {
        p_other_user_id: otherUserId,
      });
      if (error) throw error;
      navigation.replace('ChatRoom', {
        conversationId: data as string,
        otherUserName: name,
        otherUserId,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.position?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Pesan Baru</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari anggota..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView>
        {filtered.map(m => (
          <TouchableOpacity
            key={m.id}
            style={styles.listItem}
            onPress={() => m.user_id && startChat(m.user_id, m.full_name)}
          >
            <View style={styles.listAvatar}>
              <Text style={styles.listAvatarText}>{getInitials(m.full_name)}</Text>
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{m.full_name}</Text>
              <Text style={styles.listSubtitle}>{m.position?.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada anggota</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  searchBar: { padding: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: {
    padding: 10, paddingLeft: 14, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: 20, fontSize: 14, backgroundColor: COLORS.background,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  listAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
