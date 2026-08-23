import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Constants from 'expo-constants';
import { getAllPostsForAdmin, deletePostAdmin } from '@services';
import type { PostWithDetails, RootStackParamList } from '@types';
import { formatDateTime } from '@utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  bluePrimary: '#1D63ED',
  blueDeep: '#0B1E3D',
  teal: '#22D3B5',
  surface: '#F7F9FF',
  ink: '#10162B',
  inkSoft: '#5B6478',
  line: '#E6EAF5',
  danger: '#D92D20',
  dangerBg: '#FEF2F1',
  successBg: '#EAFBF4',
  success: '#0F9D6B',
};

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** post_media selalu di bucket post-media (public) — beda dari report-media. */
function getPostMediaUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/post-media/${storagePath}`;
}

export default function AdminPostsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getAllPostsForAdmin();
    if (error) {
      console.error('[AdminPosts] Gagal memuat postingan:', error.message);
    }
    setPosts(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    })();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const handleDelete = useCallback(
    (post: PostWithDetails) => {
      Alert.alert('Hapus Postingan', `Hapus postingan dari ${post.author_name ?? 'anggota ini'}?`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setMutatingId(post.id);
            const { error } = await deletePostAdmin(post.id);
            setMutatingId(null);
            if (error) {
              Alert.alert('Gagal', error.message);
              return;
            }
            load();
          },
        },
      ]);
    },
    [load]
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoadingContainer}>
        <ActivityIndicator color={COLORS.bluePrimary} />
      </View>
    );
  }

  const now = Date.now();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Moderasi Postingan</Text>
          <Text style={styles.headerSub}>{posts.length} postingan (aktif & kadaluarsa)</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.bluePrimary} />}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.bluePrimary} />
          </View>
        ) : posts.length === 0 ? (
          <Text style={styles.emptyText}>
            Belum ada postingan di feed sosial. Halaman ini akan otomatis terisi begitu anggota mulai memposting.
          </Text>
        ) : (
          posts.map((post) => {
            const isExpired = new Date(post.expires_at).getTime() <= now;
            const isMutating = mutatingId === post.id;
            const sortedMedia = [...post.media].sort((a, b) => a.media_order - b.media_order);
            return (
              <View key={post.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardAuthor}>{post.author_name ?? 'Anggota tidak dikenal'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: isExpired ? '#F1F2F6' : COLORS.successBg }]}>
                    <Text style={[styles.statusBadgeText, { color: isExpired ? COLORS.inkSoft : COLORS.success }]}>
                      {isExpired ? 'Kadaluarsa' : 'Aktif'}
                    </Text>
                  </View>
                </View>

                {post.content ? <Text style={styles.cardContent}>{post.content}</Text> : null}

                {sortedMedia.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                    {sortedMedia.map((m) => (
                      <View key={m.id} style={styles.mediaThumbWrap}>
                        {m.media_type === 'image' ? (
                          <Image source={{ uri: getPostMediaUrl(m.storage_path) }} style={styles.mediaThumb} />
                        ) : (
                          <View style={[styles.mediaThumb, styles.videoPlaceholder]}>
                            <Text style={styles.videoPlaceholderText}>▶ Video{m.duration_seconds ? ` ${m.duration_seconds}s` : ''}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.cardMeta}>
                  Diposting {formatDateTime(post.created_at)} · kadaluarsa {formatDateTime(post.expires_at)}
                </Text>

                <Pressable
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => handleDelete(post)}
                  disabled={isMutating}
                >
                  {isMutating ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Hapus Postingan</Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  fontLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.blueDeep,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerTitle: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontFamily: 'Inter_500Medium', marginTop: 2 },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.inkSoft, fontFamily: 'Inter_500Medium', fontSize: 12.5, textAlign: 'center', paddingVertical: 40, lineHeight: 18 },

  card: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: COLORS.line, borderRadius: 16, padding: 14, gap: 8 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardAuthor: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 13.5, color: COLORS.ink },
  statusBadge: { borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  statusBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  cardContent: { fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.ink, lineHeight: 18 },

  mediaRow: { marginTop: 2 },
  mediaThumbWrap: { marginRight: 8 },
  mediaThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#EEF1FA' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  videoPlaceholderText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: COLORS.inkSoft, textAlign: 'center' },

  cardMeta: { fontFamily: 'Inter_500Medium', fontSize: 10.5, color: '#9AA3B8' },

  actionBtn: {
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    backgroundColor: '#FBFCFF',
    marginTop: 4,
  },
  actionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11.5, color: COLORS.ink },
  actionBtnDanger: { borderColor: COLORS.dangerBg, backgroundColor: COLORS.dangerBg },
});
