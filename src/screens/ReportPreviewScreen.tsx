import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@types';
import { getReportById } from '@services';
import { generateReportHtml } from '@services/pdfService';

type RouteProps = RouteProp<RootStackParamList, 'ReportPreview'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Preview VISUAL laporan sebelum diekspor ke PDF.
 * Merender HTML asli yang persis akan dipakai generateReportPdf() lewat
 * WebView — sehingga apa yang dilihat di sini = apa yang akan ada di PDF
 * (single source of truth: generateReportHtml di pdfService).
 */
export default function ReportPreviewScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { reportId } = route.params;

  const [html, setHtml] = useState<string>('');
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setIsLoadingReport(true);
    setError(null);
    const { data, error: fetchError } = await getReportById(reportId);
    if (fetchError || !data) {
      setError(fetchError?.message ?? 'Laporan tidak ditemukan.');
      setIsLoadingReport(false);
      return;
    }
    setHtml(generateReportHtml(data));
    setIsLoadingReport(false);
  }, [reportId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  if (isLoadingReport) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1D63ED" />
        <Text style={styles.loadingText}>Menyiapkan preview...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadPreview}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Preview Laporan</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.webviewWrap}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          onLoadEnd={() => setIsWebViewReady(true)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoadingOverlay}>
              <ActivityIndicator size="large" color="#1D63ED" />
            </View>
          )}
        />
        {!isWebViewReady && (
          <View style={styles.webviewLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#1D63ED" />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.generateButton}
          onPress={() => navigation.navigate('ReportPdfViewer', { reportId })}
        >
          <Text style={styles.generateButtonText}>Generate PDF</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F9FC',
  },
  loadingText: {
    marginTop: 12,
    color: '#5B6478',
    fontSize: 14,
  },
  errorText: {
    color: '#D92D20',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1D63ED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EAF3',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    minWidth: 72,
  },
  backButtonText: {
    color: '#1D63ED',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10162B',
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webviewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3EAF3',
    backgroundColor: '#FFFFFF',
  },
  generateButton: {
    backgroundColor: '#1D63ED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
