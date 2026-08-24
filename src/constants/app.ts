// WAJIB sinkron dengan CHECK constraint database
// Lihat FULL-SCHEMA.md untuk constraint asli

export const REPORT_CONFIG = {
  activity_basis: { max: 150, label: 'Dasar Kegiatan' },
  activity_place: { max: 100, label: 'Tempat' },
  activity_name: { max: 150, label: 'Nama Kegiatan' },
  participants: { max: 250, label: 'Peserta' },
  activity_description: { max: 800, label: 'Deskripsi Kegiatan' },
  max_media: 2,
} as const;

export const POST_CONFIG = {
  max_content_length: 2000,
  max_media: 10, // tidak ada batas atas di DB, tapi FE batasi
  max_duration_hours: 48,
} as const;

export const CHAT_CONFIG = {
  max_body_length: 4000,
  max_attachment_size: 10 * 1024 * 1024, // 10 MB
  allowed_mime_types: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/webm',
  ] as const,
} as const;

export const ANNOUNCEMENT_CONFIG = {
  max_active: 3,
  max_display_duration: 180,
  min_display_duration: 1,
} as const;

export const STORAGE_CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  REPORT_MEDIA_PATH: (userId: string, reportId: string, order: number) =>
    `${userId}/reports/${reportId}/${order}.jpg`,
  POST_MEDIA_PATH: (userId: string, postId: string, filename: string) =>
    `${userId}/posts/${postId}/${filename}`,
  CHAT_MEDIA_PATH: (userId: string, conversationId: string, filename: string) =>
    `${userId}/chat/${conversationId}/${filename}`,
} as const;

export const ELIGIBLE_POSITIONS = [
  'Bendahara',
  'Sekretaris',
  'Pokja I',
  'Pokja II',
  'Pokja III',
  'Pokja IV',
] as const;

export const POSITION_CODES = {
  KETUA: 'KETUA',
  WAKIL_KETUA: 'WAKIL_KETUA',
  SEKRETARIS: 'SEKRETARIS',
  BENDAHARA: 'BENDAHARA',
  POKJA_I: 'POKJA_I',
  POKJA_II: 'POKJA_II',
  POKJA_III: 'POKJA_III',
  POKJA_IV: 'POKJA_IV',
} as const;

export const COLORS = {
  primary: '#00BFA6',
  primaryDark: '#009E8A',
  primaryLight: '#E0F7F4',
  secondary: '#00D9C0',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
} as const;
