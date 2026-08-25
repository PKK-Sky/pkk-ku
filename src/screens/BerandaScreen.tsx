import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video, ResizeMode } from 'expo-av';
import type { RootStackParamList, Announcement, Member, Post, PostMedia } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';
import { getMembersByUserIds } from '@services';
import { useAuthContext } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { formatTimeAgo } from '../utils/date';
import Avatar from '../components/Avatar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PostWithAuthor = Post & { authorName: string; authorAvatar: string | null };

export default function BerandaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();
  const { unreadCount } = useNotifications(user?.id ?? null);

  const [member, setMember] = useState<Member | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const [{ data: memberData }, { data: annData }] = await Promise.all([
        supabase.from('members').select('*, position:positions(*)').eq('user_id', userId).single(),
        supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .lte('start_at', new Date().toISOString())
          .gte('end_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      setMember(memberData);
      setAnnouncements(annData || []);

      const { data, error: postsError } = await supabase
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

      if (postsError) throw postsError;

      const authorMap = await getMembersByUserIds((data || []).map(post => post.user_id));

      const postsWithStatus = await Promise.all((data || []).map(async post => {
        const [{ data: liked }, { data: saved }] = await Promise.all([
          supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', userId).maybeSingle(),
          supabase.from('post_saves').select('id').eq('post_id', post.id).eq('user_id', userId).maybeSingle(),
        ]);
        const author = authorMap.get(post.user_id);
        return {
          ...post,
          authorName: author?.full_name || 'Anggota PKK',
          authorAvatar: author?.avatar_url || null,
          is_liked: !!liked,
          is_saved: !!saved,
          likes_count: (post.likes as any)?.[0]?.count || 0,
          comments_count: (post.comments as any)?.[0]?.count || 0,
          saves_count: (post.saves as any)?.[0]?.count || 0,
        };
      }));

      setPosts(postsWithStatus);
    } catch (err) {
      console.error('[Beranda] gagal memuat data:', err);
      setError('Beranda gagal dimuat. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchAll();
    }, [fetchAll]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user?.id) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, is_liked: !currentlyLiked, likes_count: (p.likes_count || 0) + (currentlyLiked ? -1 : 1) }
      : p));
    if (currentlyLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
  };

  const toggleSave = async (postId: string, currentlySaved: boolean) => {
    if (!user?.id) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, is_saved: !currentlySaved, saves_count: (p.saves_count || 0) + (currentlySaved ? -1 : 1) }
      : p));
    if (currentlySaved) {
      await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_saves').insert({ post_id: postId, user_id: user.id });
    }
  };

  const sharePost = async (post: PostWithAuthor) => {
    try {
      await Share.share({
        message: post.content
          ? `${post.authorName} membagikan di Beranda PKK:\n\n${post.content}`
          : `Lihat postingan ${post.authorName} di Beranda PKK.`,
      });
    } catch (err) {
      console.error('[Beranda] gagal membagikan postingan:', err);
    }
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
      {/* Topbar ala medsos */}
      <View style={styles.topbar}>
        <Text style={styles.brand}>PKK<Text style={{ color: COLORS.text }}>Warakas</Text></Text>
        <View style={styles.topbarActions}>
          <TouchableOpacity
            style={styles.topbarIcon}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifikasi"
          >
            <Text style={styles.topbarIconText}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Composer card */}
        <View style={styles.composerCard}>
          <TouchableOpacity
            style={styles.composerRow}
            onPress={() => navigation.navigate('CreatePost')}
            activeOpacity={0.8}
          >
            <Avatar name={member?.full_name} uri={member?.avatar_url} size={40} />
            <View style={styles.composerInput}>
              <Text style={styles.composerPlaceholder}>
                Apa yang sedang Anda pikirkan, {(member?.full_name || 'Ibu/Bapak').split(' ')[0]}?
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.composerDivider} />
          <View style={styles.composerActionsRow}>
            <TouchableOpacity style={styles.composerAction} onPress={() => navigation.navigate('CreatePost')}>
              <Text style={styles.composerActionIcon}>🖼️</Text>
              <Text style={styles.composerActionText}>Foto/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.composerAction} onPress={() => navigation.navigate('CreatePost')}>
              <Text style={styles.composerActionIcon}>✍️</Text>
              <Text style={styles.composerActionText}>Tulis Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pengumuman highlight, gaya "stories" */}
        {announcements.length > 0 && (
          <View style={styles.annSection}>
            <View style={styles.annSectionHeader}>
              <Text style={styles.annSectionTitle}>📢 Pengumuman Aktif</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
                <Text style={styles.seeAll}>Lihat semua</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.annScroll}>
              {announcements.map(ann => (
                <TouchableOpacity
                  key={ann.id}
                  style={styles.annCard}
                  onPress={() => navigation.navigate('Announcements')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.annCardTitle} numberOfLines={1}>{ann.title || 'Pengumuman'}</Text>
                  <Text style={styles.annCardMessage} numberOfLines={3}>{ann.message}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Feed */}
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => void fetchAll()}>
              <Text style={styles.emptyBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Beranda masih sepi</Text>
            <Text style={styles.emptyText}>Jadilah yang pertama membagikan kegiatan PKK hari ini.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreatePost')}>
              <Text style={styles.emptyBtnText}>Buat Postingan Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Avatar name={post.authorName} uri={post.authorAvatar} size={40} />
              <View style={styles.postUser}>
                <Text style={styles.postUserName}>{post.authorName}</Text>
                <Text style={styles.postUserTime}>
                  {formatTimeAgo(post.created_at)} · {post.user_id === user?.id ? 'Anda' : 'Anggota PKK'}
                </Text>
              </View>
            </View>

            {post.content ? <Text style={styles.postCaption}>{post.content}</Text> : null}

            {post.media && post.media.length > 0 && (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.postMedia}>
                {post.media
                  .slice()
                  .sort((a, b) => a.media_order - b.media_order)
                  .map(renderMedia)}
              </ScrollView>
            )}

            <View style={styles.postStatsRow}>
              {(post.likes_count || 0) > 0 && (
                <Text style={styles.postStatsText}>❤️ {post.likes_count}</Text>
              )}
              <View style={{ flex: 1 }} />
              {(post.comments_count || 0) > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                  <Text style={styles.postStatsText}>{post.comments_count} komentar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id, !!post.is_liked)}>
                <Text style={[styles.actionText, post.is_liked && styles.actionActive]}>
                  {post.is_liked ? '❤️ Disukai' : '🤍 Suka'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              >
                <Text style={styles.actionText}>💬 Komentar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => sharePost(post)}>
                <Text style={styles.actionText}>↗️ Bagikan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSmall} onPress={() => toggleSave(post.id, !!post.is_saved)}>
                <Text style={[styles.actionText, post.is_saved && styles.actionActive]}>
                  {post.is_saved ? '🔖' : '📑'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topbarIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  topbarIconText: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 2, borderColor: COLORS.white,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  composerCard: {
    backgroundColor: COLORS.white, margin: 12, borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  composerInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  composerPlaceholder: { color: COLORS.textMuted, fontSize: 14 },
  composerDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  composerActionsRow: { flexDirection: 'row', gap: 8 },
  composerAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 10,
  },
  composerActionIcon: { fontSize: 16 },
  composerActionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  annSection: { paddingTop: 4, paddingBottom: 8 },
  annSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10,
  },
  annSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  annScroll: { paddingHorizontal: 12, gap: 10 },
  annCard: {
    width: 200, backgroundColor: COLORS.white, borderRadius: 16, padding: 14, marginHorizontal: 4,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  annCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  annCardMessage: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 18,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  postUser: { flex: 1 },
  postUserName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  postUserTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  postCaption: { paddingHorizontal: 14, paddingTop: 10, fontSize: 14, lineHeight: 20, color: COLORS.text },
  postMedia: {
    width: '100%',
    aspectRatio: 4 / 3,
    marginTop: 10,
    backgroundColor: COLORS.primaryLight,
  },
  mediaAsset: {
    width: 360,
    height: '100%',
    backgroundColor: '#111827',
  },
  postStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10,
  },
  postStatsText: { fontSize: 12, color: COLORS.textMuted },
  postActions: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  actionBtnSmall: { width: 44, alignItems: 'center', paddingVertical: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  actionActive: { color: COLORS.danger },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '600' },
});
