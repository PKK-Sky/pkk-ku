/**
 * Service laporan kegiatan.
 * Sesuai kontrak backend §2, §4, §7.
 */
import { supabase } from '@lib/supabase';
import type {
  Report,
  ReportInsertPayload,
  ReportMedia,
  ReportMediaInsertPayload,
  ReportWithDetails,
  ReportRecipient,
} from '@types';

// ──────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────

/**
 * Insert satu baris ke tabel reports.
 * HANYA mengirim field input user — identitas, timestamp, status dibiarkan database.
 */
export async function createReport(payload: ReportInsertPayload) {
  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select('*')
    .single();

  return { data: data as Report | null, error };
}

// ──────────────────────────────────────────
// READ
// ──────────────────────────────────────────

/**
 * Ambil laporan milik user yang sedang login.
 */
export async function getMyReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      media:report_media(*),
      recipients:report_recipients(*)
    `)
    .order('created_at', { ascending: false });

  return { data: data as ReportWithDetails[] | null, error };
}

/**
 * Ambil satu laporan lengkap dengan media dan recipients.
 */
export async function getReportById(reportId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      media:report_media(*),
      recipients:report_recipients(*)
    `)
    .eq('id', reportId)
    .single();

  return { data: data as ReportWithDetails | null, error };
}

/**
 * Ambil laporan yang ditujukan ke user sebagai recipient.
 */
export async function getRecipientReports() {
  const { data, error } = await supabase
    .from('report_recipients')
    .select(`
      *,
      report:reports(
        *,
        media:report_media(*),
        recipients:report_recipients(*)
      )
    `)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Ambil seluruh laporan yang dapat dibaca admin.
 * RLS backend menentukan akses; frontend tidak menambahkan recipient secara manual.
 */
export async function getAllReportsForAdmin() {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      media:report_media(*),
      recipients:report_recipients(*)
    `)
    .order('created_at', { ascending: false });

  return { data: data as ReportWithDetails[] | null, error };
}

// ──────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────

/**
 * Update laporan (hanya milik sendiri, sesuai RLS).
 */
export async function updateReport(
  reportId: string,
  payload: Partial<ReportInsertPayload>
) {
  const { data, error } = await supabase
    .from('reports')
    .update(payload)
    .eq('id', reportId)
    .select('*')
    .single();

  return { data: data as Report | null, error };
}

/**
 * Tandai recipient sebagai sudah dibaca.
 */
export async function markAsRead(recipientId: string) {
  const { data, error } = await supabase
    .from('report_recipients')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', recipientId)
    .select('*')
    .single();

  return { data: data as ReportRecipient | null, error };
}

// ──────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────

/**
 * Hapus laporan (hanya milik sendiri, sesuai RLS).
 * Media terkait akan dihapus cascade oleh database.
 */
export async function deleteReport(reportId: string) {
  return supabase.from('reports').delete().eq('id', reportId);
}

// ──────────────────────────────────────────
// MEDIA
// ──────────────────────────────────────────

/**
 * Insert metadata media ke tabel report_media.
 */
export async function createReportMedia(payload: ReportMediaInsertPayload) {
  const { data, error } = await supabase
    .from('report_media')
    .insert(payload)
    .select('*')
    .single();

  return { data: data as ReportMedia | null, error };
}

/**
 * Insert multiple media records.
 */
export async function createReportMediaBatch(
  payloads: ReportMediaInsertPayload[]
) {
  const { data, error } = await supabase
    .from('report_media')
    .insert(payloads)
    .select('*');

  return { data: data as ReportMedia[] | null, error };
}
