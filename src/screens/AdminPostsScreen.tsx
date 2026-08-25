import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Post } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';
import { getMembersByUserIds } from '@services';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPosts'>;

type PostWithAuthor = Post & { authorName: string };

export default function AdminPostsScreen({ navigation }: Props) {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'reported' | 'deleted'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      // Catatan: posts.user_id mereferensi auth.users.id, dan skema auth tidak bisa
      // di-join langsung lewat PostgREST — jadi nama penulis di-resolve terpisah
      // lewat tabel members (yang punya kolom user_id).
      const { data, error } = await supabase
        .from('posts')
        .select('*, media:post_media(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const authorMap = await getMembersByUserIds((data || []).map(post => post.user_id));
      setPosts((data || []).map(post => ({
        ...(post as Post),
        authorName: authorMap.get(post.user_id)?.full_name || 'Anggota PKK',
      })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  const handleDelete = async (postId: string) => {
    Alert.alert('Konfirmasi', 'Hapus postingan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('posts').delete().eq('id', postId);
          if (error) Alert.alert('Error', error.message);
          else fetchPosts();
        },
      },
    ]);
  };

  const filteredPosts = posts.filter(() => {
    if (activeTab === 'all') return true;
    if (activeTab === 'deleted') return false; // Soft delete tidak ada di schema
    return true;
  });

  const getInitials = (name: string = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
          <Text style={styles.topbarIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Kelola Postingan</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {(['all', 'reported', 'deleted'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'Semua' : tab === 'reported' ? 'Dilaporkan' : 'Dihapus'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredPosts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarText}>
                  {getInitials((post.user as any)?.raw_user_meta_data?.name || 'User')}
                </Text>
              </View>
              <View style={styles.postUser}>
                <Text style={styles.postUserName}>
                  {(post.user as any)?.raw_user_meta_data?.name || 'User'}
                </Text>
                <Text style={styles.postUserTime}>
                  {new Date(post.created_at).toLocaleDateString('id-ID')}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.badgeText, { color: '#065F46' }]}>Aktif</Text>
              </View>
            </View>

            {post.media && post.media.length > 0 && (
              <View style={styles.postMedia}>
                <Text style={styles.postMediaText}>[Media]</Text>
              </View>
            )}

            <Text style={styles.postCaption}>{post.content}</Text>

            <View style={styles.postActions}>
              <Text style={styles.postStats}>❤️ {post.likes_count || 0}  💬 {post.comments_count || 0}  🔖 {post.saves_count || 0}</Text>
              <TouchableOpacity onPress={() => handleDelete(post.id)}>
                <Text style={styles.deleteText}>🗑️ Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    gap: 16,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  postCard: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
    paddingBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  postUser: { flex: 1 },
  postUserName: { fontSize: 14, fontWeight: '600' },
  postUserTime: { fontSize: 12, color: COLORS.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  postMedia: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMediaText: { color: COLORS.textMuted, fontSize: 14 },
  postCaption: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, lineHeight: 20 },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: { fontSize: 13, color: COLORS.textSecondary },
  deleteText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
});
