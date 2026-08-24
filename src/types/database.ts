/**
 * Kontrak tipe data berdasarkan schema Supabase aktual.
 * Semua tipe ini harus sinkron dengan kontrak backend.
 */

// ──────────────────────────────────────────
// TABEL: reports
// ──────────────────────────────────────────
export interface Report {
  id: string;
  created_by: string;
  creator_name: string;
  creator_position: string;
  chairperson_name: string;
  activity_basis: string;
  activity_date: string; // ISO date: YYYY-MM-DD
  activity_time: string; // ISO time: HH:mm:ss
  activity_place: string;
  activity_name: string;
  participants: string;
  activity_description: string;
  status: ReportStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Payload insert reports — HANYA field input user
export interface ReportInsertPayload {
  activity_basis: string;
  activity_date: string;
  activity_time: string;
  activity_place: string;
  activity_name: string;
  participants: string;
  activity_description: string;
}

// ──────────────────────────────────────────
// TABEL: report_media
// ──────────────────────────────────────────
export interface ReportMedia {
  id: string;
  report_id: string;
  storage_path: string;
  media_order: number;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
  created_at: string;
}

export interface ReportMediaInsertPayload {
  report_id: string;
  storage_path: string;
  media_order: number;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
}

// ──────────────────────────────────────────
// TABEL: report_recipients
// ──────────────────────────────────────────
export interface ReportRecipient {
  id: string;
  report_id: string;
  recipient_user_id: string;
  recipient_type: RecipientType;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type RecipientType = 'admin' | 'ketua' | 'wakil_ketua';

// ──────────────────────────────────────────
// TABEL: profiles
// (skema asli hanya: id, name, role — BUKAN email/full_name/avatar_url)
// ──────────────────────────────────────────
export interface Profile {
  id: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// TABEL: members
// (full_name/phone/address/avatar_url ada di tabel members, BUKAN di profiles)
// ──────────────────────────────────────────
export interface Member {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  position_id: string;
  address: string | null;
  avatar_url: string | null;
  registration_status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'active' | 'pending' | 'inactive' | 'rejected';

// ──────────────────────────────────────────
// TABEL: positions
// (kolom asli: id, code, name, type, sort_order, created_at — TIDAK ada level/updated_at)
// ──────────────────────────────────────────
export interface Position {
  id: string;
  code: string;
  name: string;
  type: string;
  sort_order: number;
  created_at: string;
}

// ──────────────────────────────────────────
// TABEL: announcements
// ──────────────────────────────────────────
export interface Announcement {
  id: string;
  title: string | null;
  message: string;
  created_by: string | null;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  display_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// TABEL: notification_inbox
// ──────────────────────────────────────────
export type NotificationKind = 'chat_message' | 'report_received' | 'announcement' | 'social_activity';

export interface NotificationInboxItem {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

// ──────────────────────────────────────────
// COMPOSITE TYPES
// ──────────────────────────────────────────
export interface ReportWithDetails extends Report {
  media: ReportMedia[];
  recipients: ReportRecipient[];
}

export interface MemberWithPosition extends Member {
  position: Position | null;
  profile: Profile | null;
}

export interface CreatorIdentity {
  creator_name: string;
  creator_position: string;
  chairperson_name: string;
}
