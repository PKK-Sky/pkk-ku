import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ChatConversation, Member } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatList'>;

type ConversationListItem = ChatConversation & {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastReadAt: string | null;
};

export default function ChatListScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from('chat_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('[ChatList] gagal memuat membership:', membershipsError.message);
      setConversations([]);
      setError('Percakapan gagal dimuat. Periksa koneksi lalu coba lagi.');
      setLoading(false);
      return;
    }

    const membershipByConversation = new Map(
      (memberships || []).map(item => [item.conversation_id, item.last_read_at]),
    );
    const conversationIds = Array.from(membershipByConversation.keys());

    if (conversationIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: conversationRows, error: conversationsError } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (conversationsError) {
      console.error('[ChatList] gagal memuat percakapan:', conversationsError.message);
      setConversations([]);
      setError('Percakapan gagal dimuat. Periksa koneksi lalu coba lagi.');
      setLoading(false);
      return;
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('chat_members')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds)
      .neq('user_id', userId);

    if (membersError) {
      console.error('[ChatList] gagal memuat lawan bicara:', membersError.message);
      setConversations([]);
      setError('Daftar anggota gagal dimuat. Coba lagi.');
      setLoading(false);
      return;
    }

    const otherUserIds = Array.from(new Set((memberRows || []).map(item => item.user_id)));
    // RLS `members` hanya mengizinkan admin ATAU baris milik diri sendiri — query
    // langsung ke tabel akan selalu kosong untuk lawan chat. Pakai RPC
    // get_members_public() (SECURITY DEFINER, field publik saja).
    const { data: memberProfiles } = otherUserIds.length
      ? await supabase.rpc('get_members_public', { p_user_ids: otherUserIds })
      : { data: [] as Pick<Member, 'user_id' | 'full_name' | 'avatar_url'>[] };

    const profilesByUser = new Map(
      (memberProfiles || []).map(profile => [profile.user_id, profile]),
    );
    const otherByConversation = new Map(
      (memberRows || []).map(item => [item.conversation_id, item.user_id]),
    );

    const items = (conversationRows || []).map(row => {
      const otherUserId = otherByConversation.get(row.id) || '';
      const profile = profilesByUser.get(otherUserId);
      return {
        ...(row as ChatConversation),
        otherUserId,
        otherUserName: profile?.full_name || 'Anggota PKK',
        otherUserAvatar: profile?.avatar_url || null,
        lastReadAt: membershipByConversation.get(row.id) || null,
      };
    });

    setConversations(items);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    const channel = supabase
      .channel('chat-list-refresh')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        void loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_conversations' }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const openConversation = (item: ConversationListItem) => {
    navigation.navigate('ChatRoom', {
      conversationId: item.id,
      otherUserName: item.otherUserName,
      otherUserId: item.otherUserId,
    });
  };

  const renderItem = ({ item }: { item: ConversationListItem }) => {
    const isUnread =
      !!item.last_message_at &&
      (!item.lastReadAt || new Date(item.last_message_at) > new Date(item.lastReadAt));

    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.itemUnread]}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.otherUserName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{item.otherUserName}</Text>
          <Text style={styles.preview} numberOfLines={1}>
            {item.last_message_preview || 'Belum ada pesan'}
          </Text>
        </View>
        <View style={styles.meta}>
          {item.last_message_at && (
            <Text style={styles.time}>
              {new Date(item.last_message_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          )}
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pesan</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NewChat')}
          style={styles.newButton}
          accessibilityLabel="Mulai percakapan baru"
        >
          <Text style={styles.newButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Percakapan tidak tersedia</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void loadConversations()}>
            <Text style={styles.primaryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Belum ada percakapan</Text>
              <Text style={styles.emptyText}>Mulai chat dengan anggota PKK lainnya.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('NewChat')}>
                <Text style={styles.primaryButtonText}>Pesan Baru</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: COLORS.primary, fontSize: 22 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  newButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  newButtonText: { color: COLORS.white, fontSize: 24, lineHeight: 26 },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemUnread: { backgroundColor: COLORS.primaryLight },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  content: { flex: 1, minWidth: 0 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  preview: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 7 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  primaryButtonText: { color: COLORS.white, fontWeight: '700' },
});