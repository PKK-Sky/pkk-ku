/**
 * Tipe untuk form state dan validasi
 */

export interface ReportFormData {
  activity_basis: string;
  activity_date: string;
  activity_time: string;
  activity_place: string;
  activity_name: string;
  participants: string;
  activity_description: string;
}

export interface CroppedImage {
  uri: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  mimeType: string;
  fileSize?: number;
}

export interface ReportDraft {
  formData: ReportFormData;
  images: CroppedImage[];
  savedAt: string; // ISO 8601
}

export type ReportSubmissionState =
  | 'draft'
  | 'uploading'
  | 'submitting'
  | 'processing_media'
  | 'sent'
  | 'partial_failure'
  | 'failed';

export interface SubmissionProgress {
  state: ReportSubmissionState;
  currentStep: number;
  totalSteps: number;
  message: string;
  reportId?: string;
  error?: string;
}
