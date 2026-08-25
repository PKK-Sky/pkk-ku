import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Post, PostMedia } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';
import { getMembersByUserIds } from '@services';
import { Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

type PostWithAuthor = Post & { authorName: string };

export default function FeedScreen({ navigation }: Props) {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      setCurrentUserId(user.user?.id || '');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          media:post_media(*),
          likes:post_likes(count),
          comments:post_comments(count),
          saves:post_saves(count)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Nama asli penulis tiap post (posts.user_id mereferensi auth.users.id,
      // jadi harus di-resolve lewat tabel members secara terpisah).
      const authorMap = await getMembersByUserIds((data || []).map(post => post.user_id));

      // Cek like/save status untuk user saat ini
      const postsWithStatus = await Promise.all((data || []).map(async post => {
        const [{ data: liked }, { data: saved }] = await Promise.all([
          supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.user?.id).maybeSingle(),
          supabase.from('post_saves').select('id').eq('post_id', post.id).eq('user_id', user.user?.id).maybeSingle(),
        ]);
        return {
          ...post,
          authorName: authorMap.get(post.user_id)?.full_name || 'Anggota PKK',
          is_liked: !!liked,
          is_saved: !!saved,
          likes_count: (post.likes as any)?.[0]?.count || 0,
          comments_count: (post.comments as any)?.[0]?.count || 0,
          saves_count: (post.saves as any)?.[0]?.count || 0,
        };
      }));

      setPosts(postsWithStatus);
    } catch (err) {
      console.error(err);
      setError('Feed gagal dimuat. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void fetchPosts();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (currentlyLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
    }
    fetchPosts();
  };

  const toggleSave = async (postId: string, currentlySaved: boolean) => {
    if (currentlySaved) {
      await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', currentUserId);
    } else {
      await supabase.from('post_saves').insert({ post_id: postId, user_id: currentUserId });
    }
    fetchPosts();
  };

  const sharePost = async (post: PostWithAuthor) => {
    try {
      await Share.share({
        message: post.content
          ? `${post.authorName} membagikan di Feed PKK:\n\n${post.content}`
          : `Lihat postingan ${post.authorName} di Feed PKK.`,
      });
    } catch (err) {
      console.error('[Feed] gagal membagikan postingan:', err);
    }
  };

  const getInitials = (name: string = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} j`;
    return `${Math.floor(diff / 86400)} h`;
  };

  const renderMedia = (media: PostMedia) => {
    const uri = supabase.storage.from('post-media').getPublicUrl(media.storage_path).data.publicUrl;
    if (media.media_type === 'video') {
      return (
        <Video
          key={media.id}
          source={{ uri }}
          style={styles.mediaAsset}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
        />
      );
    }
    return (
      <Image
        key={media.id}
        source={{ uri }}
        style={styles.mediaAsset}
        resizeMode="cover"
        accessible
        accessibilityLabel="Media postingan"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Feed Sosial</Text>
        <TouchableOpacity
          style={styles.topbarIcon}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.topbarIconText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => void fetchPosts()}>
              <Text style={styles.emptyBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarText}>{getInitials(post.authorName)}</Text>
              </View>
              <View style={styles.postUser}>
                <Text style={styles.postUserName}>{post.authorName}</Text>
                <Text style={styles.postUserTime}>
                  {getTimeAgo(post.created_at)} · {post.user_id === currentUserId ? 'Anda' : 'Anggota'}
                </Text>
              </View>
            </View>

            {post.media && post.media.length > 0 && (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.postMedia}>
                {post.media
                  .slice()
                  .sort((a, b) => a.media_order - b.media_order)
                  .map(renderMedia)}
              </ScrollView>
            )}

            {post.content ? <Text style={styles.postCaption}>{post.content}</Text> : null}

            <View style={styles.postActions}>
              <TouchableOpacity onPress={() => toggleLike(post.id, !!post.is_liked)}>
                <Text style={[styles.actionText, post.is_liked && styles.actionActive]}>
                  {post.is_liked ? '❤️' : '🤍'} {post.likes_count}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                <Text style={styles.actionText}>💬 {post.comments_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleSave(post.id, !!post.is_saved)}>
                <Text style={[styles.actionText, post.is_saved && styles.actionActive]}>
                  {post.is_saved ? '🔖' : '📑'} {post.saves_count}
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => sharePost(post)}>
                <Text style={styles.actionText}>↗️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {posts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Belum ada postingan</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.emptyBtnText}>Buat Postingan Pertama</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
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
  topbarTitle: { fontSize: 17, fontWeight: '700' },
  topbarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarIconText: { fontSize: 20, color: COLORS.primary },
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
  postMedia: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.primaryLight,
  },
  mediaAsset: {
    width: 360,
    height: '100%',
    backgroundColor: '#111827',
  },
  postCaption: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, lineHeight: 20 },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    alignItems: 'center',
  },
  actionText: { fontSize: 14, color: COLORS.text },
  actionActive: { color: COLORS.danger },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '600' },
});
