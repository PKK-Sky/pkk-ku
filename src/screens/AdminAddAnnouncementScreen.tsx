import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, ANNOUNCEMENT_CONFIG } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAddAnnouncement'>;

export default function AdminAddAnnouncementScreen({ navigation, route }: Props) {
  const announcementId = route.params?.announcementId;
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayDuration, setDisplayDuration] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (announcementId) {
      supabase.from('announcements').select('*').eq('id', announcementId).single().then(({ data }) => {
        if (data) {
          setTitle(data.title || '');
          setMessage(data.message);
          setStartAt(data.start_at ? data.start_at.split('T')[0] : '');
          setEndAt(data.end_at ? data.end_at.split('T')[0] : '');
          setIsActive(data.is_active);
          setDisplayDuration(String(data.display_duration_seconds));
        }
      });
    }
  }, [announcementId]);

  const handleSave = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Isi pengumuman wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim() || null,
        message: message.trim(),
        is_active: isActive,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        display_duration_seconds: Math.min(
          Math.max(parseInt(displayDuration) || 10, ANNOUNCEMENT_CONFIG.min_display_duration),
          ANNOUNCEMENT_CONFIG.max_display_duration
        ),
      };

      if (announcementId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', announcementId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) {
          if (error.message.includes('Maksimal 3')) {
            Alert.alert('Batas Tercapai', 'Maksimal 3 pengumuman aktif yang dapat ditampilkan.');
            return;
          }
          throw error;
        }
      }
      Alert.alert('Sukses', announcementId ? 'Pengumuman diperbarui' : 'Pengumuman dibuat', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan');
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
          <Text style={styles.topbarTitle}>
            {announcementId ? 'Edit Pengumuman' : 'Buat Pengumuman'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Judul Pengumuman</Text>
            <TextInput
              style={styles.input}
              placeholder="Judul pengumuman"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Isi Pengumuman</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Tulis isi pengumuman lengkap..."
              multiline
              numberOfLines={5}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Tanggal Mulai</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={startAt}
                onChangeText={setStartAt}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Tanggal Berakhir</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={endAt}
                onChangeText={setEndAt}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Durasi Tampil (detik, 1-180)</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              keyboardType="number-pad"
              value={displayDuration}
              onChangeText={setDisplayDuration}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Aktifkan Sekarang</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Maksimal {ANNOUNCEMENT_CONFIG.max_active} pengumuman aktif bersamaan.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Menyimpan...' : announcementId ? 'Perbarui' : 'Publikasikan'}
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
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: COLORS.white,
  },
  row: { flexDirection: 'row', gap: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  toggleLabel: { fontWeight: '600', fontSize: 15 },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: { fontSize: 13, color: '#92400E' },
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
