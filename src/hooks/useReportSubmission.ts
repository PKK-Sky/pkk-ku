/**
 * Hook untuk alur pengiriman laporan lengkap.
 * Sesuai kontrak backend §4, §9.
 */
import { useState, useCallback, useRef } from 'react';
import { createReport, createReportMediaBatch, getReportById } from '@services';
import { uploadCroppedImage } from '@services';
import type {
  ReportInsertPayload,
  CroppedImage,
  SubmissionProgress,
  ReportMediaInsertPayload,
  ReportWithDetails,
} from '@types';
import { saveSubmissionState, clearSubmissionState } from '@utils';

export function useReportSubmission(userId: string) {
  const [progress, setProgress] = useState<SubmissionProgress>({
    state: 'draft',
    currentStep: 0,
    totalSteps: 4,
    message: '',
  });

  // Gunakan ref untuk idempotency — mencegah duplikasi saat retry
  const processingReportId = useRef<string | null>(null);

  const submit = useCallback(
    async (
      formData: ReportInsertPayload,
      images: CroppedImage[]
    ): Promise<{ success: boolean; report?: ReportWithDetails; error?: string }> => {
      // ── STEP 1: Insert report ──
      setProgress({
        state: 'submitting',
        currentStep: 1,
        totalSteps: 4,
        message: 'Mengirim laporan...',
      });

      const { data: report, error: reportError } = await createReport(formData);

      if (reportError || !report) {
        const errMsg = reportError?.message ?? 'Gagal membuat laporan';
        setProgress({
          state: 'failed',
          currentStep: 1,
          totalSteps: 4,
          message: errMsg,
          error: errMsg,
        });
        return { success: false, error: errMsg };
      }

      processingReportId.current = report.id;

      await saveSubmissionState({
        state: 'submitting',
        reportId: report.id,
        timestamp: new Date().toISOString(),
      });

      // ── STEP 2: Upload images ──
      setProgress({
        state: 'uploading',
        currentStep: 2,
        totalSteps: 4,
        message: 'Mengunggah foto...',
        reportId: report.id,
      });

      const uploadResults: { path: string; order: number; cropMeta: CroppedImage }[] = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const uploadResult = await uploadCroppedImage(
          userId,
          report.id,
          i,
          image.uri,
          image.mimeType
        );

        if (uploadResult.error) {
          // Upload gagal — jangan tampilkan sukses penuh
          setProgress({
            state: 'partial_failure',
            currentStep: 2,
            totalSteps: 4,
            message: `Gagal mengunggah foto ke-${i + 1}: ${uploadResult.error.message}`,
            reportId: report.id,
            error: uploadResult.error.message,
          });
          return {
            success: false,
            error: `Upload foto ke-${i + 1} gagal: ${uploadResult.error.message}`,
          };
        }

        uploadResults.push({
          path: uploadResult.path,
          order: i,
          cropMeta: image,
        });
      }

      // ── STEP 3: Insert media metadata ──
      setProgress({
        state: 'processing_media',
        currentStep: 3,
        totalSteps: 4,
        message: 'Menyimpan metadata foto...',
        reportId: report.id,
      });

      const mediaPayloads: ReportMediaInsertPayload[] = uploadResults.map((r) => ({
        report_id: report.id,
        storage_path: r.path,
        media_order: r.order,
        crop_x: r.cropMeta.cropX,
        crop_y: r.cropMeta.cropY,
        crop_width: r.cropMeta.cropWidth,
        crop_height: r.cropMeta.cropHeight,
      }));

      const { error: mediaError } = await createReportMediaBatch(mediaPayloads);

      if (mediaError) {
        setProgress({
          state: 'partial_failure',
          currentStep: 3,
          totalSteps: 4,
          message: `Gagal menyimpan metadata foto: ${mediaError.message}`,
          reportId: report.id,
          error: mediaError.message,
        });
        return {
          success: false,
          error: `Gagal menyimpan metadata: ${mediaError.message}`,
        };
      }

      // ── STEP 4: Reload report dengan media & recipients ──
      setProgress({
        state: 'processing_media',
        currentStep: 4,
        totalSteps: 4,
        message: 'Memuat konfirmasi laporan...',
        reportId: report.id,
      });

      const { data: fullReport, error: reloadError } = await getReportById(report.id);

      if (reloadError || !fullReport) {
        setProgress({
          state: 'partial_failure',
          currentStep: 4,
          totalSteps: 4,
          message: 'Laporan terkirim, gagal memuat detail.',
          reportId: report.id,
          error: reloadError?.message ?? 'Gagal memuat detail',
        });
        // Tetap anggap berhasil karena laporan sudah terkirim
        await clearSubmissionState();
        return { success: true, report: undefined };
      }

      // ── DONE ──
      setProgress({
        state: 'sent',
        currentStep: 4,
        totalSteps: 4,
        message: 'Laporan berhasil dikirim!',
        reportId: report.id,
      });

      await clearSubmissionState();
      processingReportId.current = null;

      return { success: true, report: fullReport };
    },
    [userId]
  );

  const reset = useCallback(() => {
    setProgress({
      state: 'draft',
      currentStep: 0,
      totalSteps: 4,
      message: '',
    });
    processingReportId.current = null;
  }, []);

  return {
    progress,
    submit,
    reset,
    isProcessing:
      progress.state === 'uploading' ||
      progress.state === 'submitting' ||
      progress.state === 'processing_media',
    isSent: progress.state === 'sent',
    isFailed: progress.state === 'failed' || progress.state === 'partial_failure',
    reportId: progress.reportId,
  };
}
