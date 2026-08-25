cat > /home/claude/pkk-ku-v3/pkk-ku-main/src/screens/PostDetailScreen.tsx << 'PDEOF'
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Post, PostComment } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';
import { getMembersByUserIds, getPublicMediaUrl } from '@services';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

type CommentWithAuthor = PostComment & { authorName: string; authorInitials: string };

const getInitials = (name: string = '') =>
  name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

export default function PostDetailScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [postAuthorName, setPostAuthorName] = useState('Anggota PKK');
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [draft, setDraft] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPost = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || '';
    setCurrentUserId(userId);

    const [{ data: postData, error: postError }, { data: commentData, error: commentError }] =
      await Promise.all([
        supabase.from('posts').select('*, media:post_media(*)').eq('id', postId).single(),
        supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
      ]);

    if (postError) Alert.alert('Error', postError.message);
    if (commentError) Alert.alert('Error', commentError.message);

    const typedPost = postData as Post | null;
    const typedComments = (commentData || []) as PostComment[];

    // Nama asli penulis post + tiap komentar, di-batch dalam satu query.
    const idsToLookup = [
      ...(typedPost ? [typedPost.user_id] : []),
      ...typedComments.map(c => c.user_id),
    ];
    const authorMap = await getMembersByUserIds(idsToLookup);

    setPost(typedPost);
    setPostAuthorName(typedPost ? (authorMap.get(typedPost.user_id)?.full_name || 'Anggota PKK') : 'Anggota PKK');
    setComments(typedComments.map(c => {
      const name = authorMap.get(c.user_id)?.full_name || 'Anggota PKK';
      return { ...c, authorName: name, authorInitials: getInitials(name) };
    }));
    setLoading(false);
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  const submitComment = async () => {
    const content = draft.trim();
    if (!content || !currentUserId || submitting) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: currentUserId, content })
      .select('*')
      .single();

    if (error) Alert.alert('Error', error.message);
    else if (data) {
      const authorMap = await getMembersByUserIds([currentUserId]);
      const name = authorMap.get(currentUserId)?.full_name || 'Anda';
      setComments(previous => [...previous, { ...(data as PostComment), authorName: name, authorInitials: getInitials(name) }]);
      setDraft('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Postingan tidak ditemukan atau sudah kedaluwarsa.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Detail Postingan</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        onRefresh={loadPost}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(postAuthorName)}</Text></View>
              <View>
                <Text style={styles.postAuthor}>{postAuthorName}</Text>
                <Text style={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString('id-ID')}
                </Text>
              </View>
            </View>
            {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
            {post.media?.map(media => (
              <Image
                key={media.id}
                source={{ uri: getPublicMediaUrl('post-media', media.storage_path) }}
                style={styles.media}
                resizeMode="cover"
              />
            ))}
            <Text style={styles.commentHeading}>Komentar ({comments.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentAvatar}><Text style={styles.avatarText}>{item.authorInitials}</Text></View>
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{item.authorName}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
              <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyComments}>Belum ada komentar.</Text>}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Tulis komentar..."
          placeholderTextColor={COLORS.textMuted}
          value={draft}
          onChangeText={setDraft}
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={submitComment}
          disabled={!draft.trim() || submitting}
          style={[styles.sendButton, (!draft.trim() || submitting) && styles.disabled]}
        >
          <Text style={styles.sendText}>Kirim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginBottom: 16 },
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
  topbarTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  spacer: { width: 40 },
  list: { paddingBottom: 16 },
  postCard: { backgroundColor: COLORS.white, padding: 16, marginBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  postAuthor: { fontWeight: '700', color: COLORS.text },
  postDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  postContent: { color: COLORS.text, fontSize: 16, lineHeight: 23, marginBottom: 12 },
  media: { width: '100%', height: 220, borderRadius: 12, marginBottom: 10, backgroundColor: COLORS.primaryLight },
  commentHeading: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  comment: { flexDirection: 'row', padding: 14, backgroundColor: COLORS.white, marginBottom: 1 },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  commentText: { color: COLORS.text, fontSize: 14, marginTop: 3, lineHeight: 19 },
  commentDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  emptyComments: { color: COLORS.textMuted, textAlign: 'center', padding: 24 },
  composer: {
    flexDirection: 'row', padding: 10, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center',
  },
  input: {
    flex: 1, minHeight: 42, borderRadius: 21, backgroundColor: COLORS.background,
    paddingHorizontal: 16, color: COLORS.text, fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 14, height: 42, borderRadius: 21, backgroundColor: COLORS.primary,
    justifyContent: 'center', marginLeft: 8,
  },
  sendText: { color: COLORS.white, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  primaryButtonText: { color: COLORS.white, fontWeight: '700' },
});
PDEOF
echo done
