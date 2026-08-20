import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ReportWithDetails } from '@types';
import { getReportById } from '@services';
import { generateReportHtml } from '@services/pdfService';

type RouteProps = RouteProp<RootStackParamList, 'ReportPreview'>;

export default function ReportPreviewScreen() {
  const route = useRoute<RouteProps>();
  const { reportId } = route.params;
  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreview();
  }, [reportId]);

  const loadPreview = async () => {
    setIsLoading(true);
    const { data } = await getReportById(reportId);
    if (data) {
      setReport(data);
      const reportHtml = generateReportHtml(data);
      setHtml(reportHtml);
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

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', padding: 16 }}>
        Preview Laporan
      </Text>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: 'monospace' }}>{html.substring(0, 500)}...</Text>
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Button title="Generate PDF" onPress={() => { /* TODO: Print to PDF */ }} />
      </View>
    </View>
  );
}
