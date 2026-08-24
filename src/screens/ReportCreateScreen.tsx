import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@types';
import type { ReportFormData } from '@types/form';
import { useEligibility, useImagePicker, useReportSubmission } from '@hooks';
import { validateReportForm, getCurrentDate, getCurrentTime } from '@utils';
import { STORAGE_CONFIG } from '@constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INITIAL_FORM: ReportFormData = {
  activity_basis: '',
  activity_date: getCurrentDate(),
  activity_time: getCurrentTime(),
  activity_place: '',
  activity_name: '',
  participants: '',
  activity_description: '',
};

export default function ReportCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isEligible, isLoading: checkingEligibility, error: eligibilityError, member, refetch } = useEligibility();
  const { images, pickFromCamera, pickFromLibrary, removeImage, canAddMore, requestPermission } = useImagePicker();
  const { progress, submit, reset, isProcessing, isSent, reportId } = useReportSubmission(member?.user_id ?? '');

  const [form, setForm] = useState<ReportFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (isSent && reportId) {
      Alert.alert('Sukses', 'Laporan berhasil dikirim!', [
        { text: 'OK', onPress: () => navigation.replace('ReportDetail', { reportId }) },
      ]);
      reset();
    }
  }, [isSent, reportId]);

  const updateField = (field: keyof ReportFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const errors = validateReportForm(form);
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach((e) => { errorMap[e.field] = e.message; });
      setFormErrors(errorMap);
      return;
    }

    if (images.length === 0) {
      Alert.alert('Perhatian', 'Tambahkan minimal 1 foto dokumentasi.');
      return;
    }

    const result = await submit(form, images);
    if (!result.success && result.error) {
      Alert.alert(
        'Gagal',
        `${result.error}

Laporan ID: ${progress.reportId ?? 'N/A'}
Anda bisa mencoba lagi tanpa membuat laporan baru.`,
        [
          { text: 'Coba Lagi', onPress: () => handleSubmit() },
          { text: 'Batal', style: 'cancel' },
        ]
      );
    }
  };

  if (checkingEligibility) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Memeriksa kelayakan...</Text>
      </View>
    );
  }

  if (!isEligible) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red', textAlign: 'center', fontSize: 16 }}>
          {eligibilityError ?? 'Anda tidak memiliki akses untuk membuat laporan.'}
        </Text>
        <Button title="Coba Lagi" onPress={refetch} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
        Buat Laporan Kegiatan
      </Text>

      {/* Read-only identity */}
      <View style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ fontWeight: 'bold' }}>Pembuat:</Text>
        <Text>{member?.full_name ?? 'N/A'} ({member?.position?.name ?? 'N/A'})</Text>
      </View>

      {/* Form fields */}
      <View style={{ gap: 12, marginBottom: 16 }}>
        <FormField
          label="Dasar Kegiatan *"
          value={form.activity_basis}
          onChangeText={(v) => updateField('activity_basis', v)}
          error={formErrors.activity_basis}
        />
        <FormField
          label="Tanggal Kegiatan *"
          value={form.activity_date}
          onChangeText={(v) => updateField('activity_date', v)}
          error={formErrors.activity_date}
        />
        <FormField
          label="Waktu Kegiatan *"
          value={form.activity_time}
          onChangeText={(v) => updateField('activity_time', v)}
          error={formErrors.activity_time}
        />
        <FormField
          label="Tempat *"
          value={form.activity_place}
          onChangeText={(v) => updateField('activity_place', v)}
          error={formErrors.activity_place}
        />
        <FormField
          label="Nama Acara *"
          value={form.activity_name}
          onChangeText={(v) => updateField('activity_name', v)}
          error={formErrors.activity_name}
        />
        <FormField
          label="Peserta *"
          value={form.participants}
          onChangeText={(v) => updateField('participants', v)}
          error={formErrors.participants}
          multiline
        />
        <FormField
          label="Uraian Kegiatan *"
          value={form.activity_description}
          onChangeText={(v) => updateField('activity_description', v)}
          error={formErrors.activity_description}
          multiline
          numberOfLines={6}
        />
      </View>

      {/* Images */}
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
        Dokumentasi Foto ({images.length}/{STORAGE_CONFIG.MAX_IMAGES_PER_REPORT})
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Button title="Kamera" onPress={pickFromCamera} disabled={!canAddMore} />
        <Button title="Galeri" onPress={pickFromLibrary} disabled={!canAddMore} />
      </View>

      {images.map((_, idx) => (
        <View key={idx} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1 }}>Foto {idx + 1}</Text>
          <Button title="Hapus" onPress={() => removeImage(idx)} color="#dc3545" />
        </View>
      ))}

      {/* Progress */}
      {isProcessing && (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
          <Text>{progress.message}</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Langkah {progress.currentStep} dari {progress.totalSteps}
          </Text>
        </View>
      )}

      <Button
        title={isProcessing ? 'Mengirim...' : 'Kirim Laporan'}
        onPress={handleSubmit}
        disabled={isProcessing}
      />
    </ScrollView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  error,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View>
      <Text style={{ fontWeight: '600', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          borderWidth: 1,
          borderColor: error ? '#dc3545' : '#ddd',
          borderRadius: 8,
          padding: 12,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {error && <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
