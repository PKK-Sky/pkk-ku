import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ReportWithDetails } from '@types';
import { getReportById } from '@services';
import { formatDate, formatTime, formatDateTime } from '@utils';

type RouteProps = RouteProp<RootStackParamList, 'ReportDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReportDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { reportId } = route.params;

  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await getReportById(reportId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReport(data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          {error ?? 'Laporan tidak ditemukan'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        {report.activity_name}
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Text><Text style={{ fontWeight: 'bold' }}>Dasar:</Text> {report.activity_basis}</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Tanggal:</Text> {formatDate(report.activity_date)}</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Waktu:</Text> {formatTime(report.activity_time)}</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Tempat:</Text> {report.activity_place}</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Peserta:</Text> {report.participants}</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Dibuat oleh:</Text> {report.creator_name} ({report.creator_position})</Text>
        <Text><Text style={{ fontWeight: 'bold' }}>Dibuat pada:</Text> {formatDateTime(report.created_at)}</Text>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Uraian Kegiatan:</Text>
      <Text style={{ marginBottom: 24, lineHeight: 20 }}>{report.activity_description}</Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Dokumentasi:</Text>
      <Text style={{ color: '#888', marginBottom: 16 }}>
        {report.media?.length ?? 0} foto terlampir
      </Text>

      <View style={{ gap: 12 }}>
        <Button
          title="Preview PDF"
          onPress={() => navigation.navigate('ReportPreview', { reportId })}
        />
        <Button
          title="Lihat PDF"
          onPress={() => navigation.navigate('ReportPdfViewer', { reportId })}
        />
      </View>
    </ScrollView>
  );
}
