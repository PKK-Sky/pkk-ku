import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ReportWithDetails } from '@types';
import { getReportById } from '@services';
import { generateReportPdf, sharePdf, downloadPdf } from '@services/pdfService';

type RouteProps = RouteProp<RootStackParamList, 'ReportPdfViewer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Bikin nama file aman dari nama kegiatan, mis. "Rapat RT 01" -> "Laporan-Rapat-RT-01.pdf" */
function buildPdfFilename(report: ReportWithDetails): string {
  const safeName = (report.activity_name || 'Kegiatan')
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `Laporan-${safeName || 'Kegiatan'}.pdf`;
}

export default function ReportPdfViewerScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { reportId } = route.params;

  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewerFailed, setViewerFailed] = useState(false);

  const loadPdf = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setViewerFailed(false);
    try {
      const { data, error: fetchError } = await getReportById(reportId);
      if (fetchError || !data) {
        setError(fetchError?.message ?? 'Laporan tidak ditemukan.');
        setIsLoading(false);
        return;
      }
      setReport(data);

      const uri = await generateReportPdf(data);
      setPdfUri(uri);

      // Render PDF sungguhan di dalam WebView lewat data URI base64 —
      // WebView Android/iOS bisa menampilkan PDF langsung dari data: URI
      // tanpa perlu library viewer PDF native tambahan.
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfDataUri(`data:application/pdf;base64,${base64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF.');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  const handleShareWhatsApp = async () => {
    if (!pdfUri || !report) return;
    setIsSharing(true);
    try {
      await sharePdf(pdfUri, `Laporan Kegiatan - ${report.activity_name}`);
    } catch (err) {
      Alert.alert('Gagal Membagikan', err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!pdfUri || !report) return;
    setIsSaving(true);
    try {
      const filename = buildPdfFilename(report);
      const savedUri = await downloadPdf(pdfUri, filename);
      Alert.alert('Tersimpan', `PDF disimpan sebagai:\n${filename}`, [{ text: 'OK' }]);
      console.log('[ReportPdfViewer] PDF tersimpan di:', savedUri);
    } catch (err) {
      Alert.alert('Gagal Menyimpan', err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1D63ED" />
        <Text style={styles.loadingText}>Membuat PDF...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadPdf}>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {report?.activity_name ?? 'PDF Laporan'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.webviewWrap}>
        {pdfDataUri && !viewerFailed ? (
          <WebView
            source={{ uri: pdfDataUri }}
            style={styles.webview}
            originWhitelist={['*']}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoadingOverlay}>
                <ActivityIndicator size="large" color="#1D63ED" />
              </View>
            )}
            onError={() => setViewerFailed(true)}
            onHttpError={() => setViewerFailed(true)}
          />
        ) : (
          <View style={styles.viewerFallback}>
            <Text style={styles.viewerFallbackTitle}>PDF Berhasil Dibuat</Text>
            <Text style={styles.viewerFallbackText}>
              Preview di dalam aplikasi tidak tersedia di perangkat ini, tapi file PDF-nya sudah
              siap. Gunakan tombol di bawah untuk membagikan atau menyimpannya.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.actionButton, styles.primaryButton, isSharing && styles.buttonDisabled]}
          onPress={handleShareWhatsApp}
          disabled={isSharing || !pdfUri}
        >
          {isSharing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Bagikan via WhatsApp</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.secondaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleSaveToDevice}
          disabled={isSaving || !pdfUri}
        >
          {isSaving ? (
            <ActivityIndicator color="#1D63ED" />
          ) : (
            <Text style={styles.secondaryButtonText}>Simpan ke Perangkat</Text>
          )}
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
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#10162B',
    marginHorizontal: 8,
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
  viewerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  viewerFallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10162B',
    marginBottom: 8,
    textAlign: 'center',
  },
  viewerFallbackText: {
    fontSize: 14,
    color: '#5B6478',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3EAF3',
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#1D63ED',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#1D63ED',
  },
  secondaryButtonText: {
    color: '#1D63ED',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
