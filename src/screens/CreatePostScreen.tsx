import React, { useState } from 'react';
import {
  Image, View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, POST_CONFIG, STORAGE_CONFIG } from '../constants/app';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

export default function CreatePostScreen({ navigation }: Props) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMedia(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, type: a.type || 'image' }))]);
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      Alert.alert('Error', 'Tulis sesuatu atau tambahkan media');
      return;
    }
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Belum login');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + POST_CONFIG.max_duration_hours);

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.user.id,
          content: content.trim() || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload media
      for (let i = 0; i < media.length; i++) {
        const file = media[i];
        const ext = file.uri.split('.').pop() || 'jpg';
        const path = STORAGE_CONFIG.POST_MEDIA_PATH(user.user.id, post.id, `${i + 1}.${ext}`);

        const response = await fetch(file.uri);
        const blob = await response.blob();

         const { error: uploadError } = await supabase.storage.from('post-media').upload(path, blob, {
          contentType: file.type === 'video' ? 'video/mp4' : 'image/jpeg',
        });
         if (uploadError) throw uploadError;

        await supabase.from('post_media').insert({
          post_id: post.id,
          media_type: file.type === 'video' ? 'video' : 'image',
          storage_path: path,
          media_order: i + 1,
        });
      }

      Alert.alert('Sukses', 'Postingan berhasil dibuat', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal membuat postingan');
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
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topbarIcon}>
            <Text style={styles.topbarIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topbarTitle}>Buat Postingan</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>SW</Text>
            </View>
            <View>
              <Text style={styles.userName}>Anda</Text>
              <Text style={styles.userRole}>Anggota PKK</Text>
            </View>
          </View>

          <TextInput
            style={styles.contentInput}
            placeholder="Apa yang sedang terjadi?"
            multiline
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

           {media.length > 0 && (
            <ScrollView horizontal style={styles.mediaPreview}>
              {media.map((m, i) => (
                <View key={i} style={styles.mediaItem}>
                   {m.type === 'video' ? (
                     <Text style={styles.mediaText}>🎥</Text>
                   ) : (
                     <Image source={{ uri: m.uri }} style={styles.mediaThumbnail} resizeMode="cover" />
                   )}
                  <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(i)}>
                    <Text style={styles.removeMediaText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
            <Text style={styles.mediaBtnText}>🖼️ Tap untuk tambah foto/video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Mengirim...' : 'Kirim Postingan'}
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
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: COLORS.white, fontWeight: '700' },
  userName: { fontWeight: '600' },
  userRole: { fontSize: 12, color: COLORS.textMuted },
  contentInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    padding: 0,
    marginBottom: 16,
  },
  mediaPreview: { flexDirection: 'row', marginBottom: 12 },
  mediaItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
  },
  mediaText: { fontSize: 24 },
  mediaThumbnail: { width: '100%', height: '100%', borderRadius: 12 },
  removeMedia: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  mediaBtn: {
    padding: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaBtnText: { color: COLORS.textMuted, fontSize: 14 },
  btnPrimary: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
