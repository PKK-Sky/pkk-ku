/**
 * Validasi form laporan
 */
import { ReportFormData } from '@types/form';
import { REPORT_CONFIG } from '@constants';

export interface ValidationError {
  field: keyof ReportFormData;
  message: string;
}

export function validateReportForm(data: ReportFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.activity_basis || data.activity_basis.trim().length === 0) {
    errors.push({ field: 'activity_basis', message: 'Dasar kegiatan wajib diisi' });
  } else if (data.activity_basis.length > REPORT_CONFIG.MAX_BASIS_LENGTH) {
    errors.push({
      field: 'activity_basis',
      message: `Dasar kegiatan maksimal ${REPORT_CONFIG.MAX_BASIS_LENGTH} karakter`,
    });
  }

  if (!data.activity_date) {
    errors.push({ field: 'activity_date', message: 'Tanggal kegiatan wajib diisi' });
  }

  if (!data.activity_time) {
    errors.push({ field: 'activity_time', message: 'Waktu kegiatan wajib diisi' });
  }

  if (!data.activity_place || data.activity_place.trim().length === 0) {
    errors.push({ field: 'activity_place', message: 'Tempat kegiatan wajib diisi' });
  } else if (data.activity_place.length > REPORT_CONFIG.MAX_PLACE_LENGTH) {
    errors.push({
      field: 'activity_place',
      message: `Tempat kegiatan maksimal ${REPORT_CONFIG.MAX_PLACE_LENGTH} karakter`,
    });
  }

  if (!data.activity_name || data.activity_name.trim().length === 0) {
    errors.push({ field: 'activity_name', message: 'Nama acara wajib diisi' });
  } else if (data.activity_name.length > REPORT_CONFIG.MAX_ACTIVITY_NAME_LENGTH) {
    errors.push({
      field: 'activity_name',
      message: `Nama acara maksimal ${REPORT_CONFIG.MAX_ACTIVITY_NAME_LENGTH} karakter`,
    });
  }

  if (!data.participants || data.participants.trim().length === 0) {
    errors.push({ field: 'participants', message: 'Peserta wajib diisi' });
  } else if (data.participants.length > REPORT_CONFIG.MAX_PARTICIPANTS_LENGTH) {
    errors.push({
      field: 'participants',
      message: `Peserta maksimal ${REPORT_CONFIG.MAX_PARTICIPANTS_LENGTH} karakter`,
    });
  }

  if (!data.activity_description || data.activity_description.trim().length === 0) {
    errors.push({ field: 'activity_description', message: 'Uraian kegiatan wajib diisi' });
  } else if (data.activity_description.length > REPORT_CONFIG.MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'activity_description',
      message: `Uraian kegiatan maksimal ${REPORT_CONFIG.MAX_DESCRIPTION_LENGTH} karakter`,
    });
  }

  return errors;
}

export function isFormValid(data: ReportFormData): boolean {
  return validateReportForm(data).length === 0;
}