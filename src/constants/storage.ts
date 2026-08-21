/**
 * Konfigurasi Storage Supabase
 */
export const STORAGE_CONFIG = {
  BUCKET_NAME: 'report-media',
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/jpg'] as const,
  MAX_IMAGES_PER_REPORT: 2,
  PATH_PREFIX: 'reports',
} as const;

export function getStoragePath(
  userId: string,
  reportId: string,
  order: number,
  extension: string = 'jpg'
): string {
  return `${STORAGE_CONFIG.PATH_PREFIX}/${userId}/${reportId}/${order}.${extension}`;
}

export function getPublicUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_CONFIG.BUCKET_NAME}/${path}`;
}
