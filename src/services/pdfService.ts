/**
 * Service PDF — Template V3 sesuai kontrak backend §6.
 * A4 portrait, margin aman, multi-halaman, overflow handling.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import type { ReportWithDetails } from '@types';
import { formatDate, formatTime, formatDateTime } from '@utils';
import { getPublicUrl } from '@constants';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl 
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL 
  ?? '';

/**
 * Generate HTML untuk laporan kegiatan.
 * Single source of truth untuk preview dan PDF export.
 */
export function generateReportHtml(report: ReportWithDetails): string {
  const mediaUrls = report.media?.map((m) =>
    getPublicUrl(SUPABASE_URL, m.storage_path)
  ) ?? [];

  const createdDate = formatDateTime(report.created_at);
  const activityDate = formatDate(report.activity_date);
  const activityTime = formatTime(report.activity_time);

  // Format uraian: ganti newline dengan <br/> atau <p>
  const formattedDescription = report.activity_description
    .split('\n')
    .map((line) => `<p style="margin: 4px 0;">${escapeHtml(line)}</p>`)
    .join('');

  // Generate foto HTML — maksimal 2 per halaman pertama, sisanya overflow
  const photosHtml = mediaUrls
    .map(
      (url, idx) => `
    <div style="margin-bottom: 16px; text-align: center;">
      <img
        src="${url}"
        style="max-width: 100%; height: auto; border-radius: 4px;"
        alt="Dokumentasi ${idx + 1}"
      />
      <p style="font-size: 10px; color: #666; margin-top: 4px;">Foto ${idx + 1}</p>
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Kegiatan - ${escapeHtml(report.activity_name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
    }
    .header-logo {
      width: 60px;
      height: auto;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header-instansi {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 4px;
    }
    .header-jabatan {
      font-size: 10pt;
      margin-top: 4px;
      font-style: italic;
    }
    .doc-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 24px 0 16px 0;
    }
    .info-table {
      width: 100%;
      margin-bottom: 16px;
    }
    .info-table td {
      padding: 4px 0;
      vertical-align: top;
    }
    .info-table .label {
      width: 30%;
      font-weight: bold;
    }
    .info-table .value {
      width: 70%;
    }
    .section-title {
      font-weight: bold;
      margin: 16px 0 8px 0;
      text-decoration: underline;
    }
    .uraian-content {
      text-align: justify;
      margin-bottom: 16px;
    }
    .photos-section {
      margin-top: 16px;
    }
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    }
    .photo-item {
      width: 45%;
      text-align: center;
    }
    .photo-item img {
      width: 100%;
      height: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .signature-section {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      margin-top: 64px;
      border-bottom: 1px solid #000;
      width: 80%;
      margin-left: auto;
      margin-right: auto;
    }
    .signature-name {
      margin-top: 8px;
      font-weight: bold;
    }
    .page-break {
      page-break-before: always;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="header-title">Laporan Kegiatan</div>
    <div class="header-instansi">TP PKK KELURAHAN WARAKAS</div>
    <div class="header-jabatan">${escapeHtml(report.creator_position)}</div>
  </div>

  <!-- JUDUL DOKUMEN -->
  <div class="doc-title">LAPORAN KEGIATAN</div>

  <!-- INFORMASI KEGIATAN -->
  <table class="info-table">
    <tr>
      <td class="label">Dasar Kegiatan</td>
      <td class="value">: ${escapeHtml(report.activity_basis)}</td>
    </tr>
    <tr>
      <td class="label">Hari & Tanggal</td>
      <td class="value">: ${escapeHtml(activityDate)}</td>
    </tr>
    <tr>
      <td class="label">Pukul</td>
      <td class="value">: ${escapeHtml(activityTime)}</td>
    </tr>
    <tr>
      <td class="label">Tempat</td>
      <td class="value">: ${escapeHtml(report.activity_place)}</td>
    </tr>
    <tr>
      <td class="label">Acara</td>
      <td class="value">: ${escapeHtml(report.activity_name)}</td>
    </tr>
    <tr>
      <td class="label">Peserta</td>
      <td class="value">: ${escapeHtml(report.participants)}</td>
    </tr>
  </table>

  <!-- URAIAN KEGIATAN -->
  <div class="section-title">URAIAN KEGIATAN</div>
  <div class="uraian-content">
    ${formattedDescription}
  </div>

  <!-- DOKUMENTASI -->
  <div class="section-title">DOKUMENTASI KEGIATAN</div>
  <div class="photos-section">
    ${photosHtml}
  </div>

  <!-- TANDA TANGAN -->
  <div class="signature-section">
    <div class="signature-box">
      <p>Ketua TP PKK Kel Warakas</p>
      <div class="signature-line"></div>
      <p class="signature-name">${escapeHtml(report.chairperson_name)}</p>
    </div>
    <div class="signature-box">
      <p>Warakas, ${escapeHtml(createdDate.split(',')[1]?.trim() ?? createdDate)}</p>
      <p>${escapeHtml(report.creator_position)}</p>
      <div class="signature-line"></div>
      <p class="signature-name">${escapeHtml(report.creator_name)}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate file PDF dari laporan.
 * Menggunakan expo-print untuk deterministik lintas platform.
 */
export async function generateReportPdf(report: ReportWithDetails): Promise<string> {
  const html = generateReportHtml(report);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * Share PDF via WhatsApp atau aplikasi lain.
 */
export async function sharePdf(fileUri: string, message?: string) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing tidak tersedia di perangkat ini');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: message ?? 'Bagikan Laporan Kegiatan',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Download PDF ke direktori dokumen perangkat.
 */
export async function downloadPdf(fileUri: string, filename: string): Promise<string> {
  const destinationUri = FileSystem.documentDirectory + filename;
  await FileSystem.copyAsync({
    from: fileUri,
    to: destinationUri,
  });
  return destinationUri;
}

/**
 * Escape HTML untuk mencegah XSS di dalam PDF.
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
