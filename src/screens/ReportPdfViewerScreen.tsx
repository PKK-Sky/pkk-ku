import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Button } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@types';
import { getReportById } from '@services';
import { generateReportPdf } from '@services/pdfService';

type RouteProps = RouteProp<RootStackParamList, 'ReportPdfViewer'>;

export default function ReportPdfViewerScreen() {
  const route = useRoute<RouteProps>();
  const { reportId } = route.params;
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPdf();
  }, [reportId]);

  const loadPdf = async () => {
    setIsLoading(true);
    try {
      const { data } = await getReportById(reportId);
      if (!data) {
        setError('Laporan tidak ditemukan');
        setIsLoading(false);
        return;
      }
      const uri = await generateReportPdf(data);
      setPdfUri(uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Membuat PDF...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
        <Button title="Coba Lagi" onPress={loadPdf} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        PDF Berhasil Dibuat
      </Text>
      <Text style={{ color: '#666', textAlign: 'center', marginBottom: 24 }}>
        {pdfUri}
      </Text>
      <Button title="Bagikan via WhatsApp" onPress={() => { /* TODO */ }} />
    </View>
  );
}
