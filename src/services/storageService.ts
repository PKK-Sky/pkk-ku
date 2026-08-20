/**
 * Service upload ke Supabase Storage.
 * Sesuai kontrak backend §5.
 */
import { supabase } from '@lib/supabase';
import { STORAGE_CONFIG } from '@constants';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface UploadResult {
  path: string;
  publicUrl: string;
  error: Error | null;
}

/**
 * Upload file hasil crop ke bucket report-media.
 * Path: reports/{userId}/{reportId}/{order}.jpg
 */
export async function uploadCroppedImage(
  userId: string,
  reportId: string,
  order: number,
  fileUri: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Validasi tipe MIME
    if (!STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new Error(`Tipe file tidak didukung: ${mimeType}`);
    }

    // Baca file sebagai base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    // Validasi ukuran
    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
    if (fileSizeMB > STORAGE_CONFIG.MAX_FILE_SIZE_MB) {
      throw new Error(
        `Ukuran file melebihi ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB (saat ini: ${fileSizeMB.toFixed(2)}MB)`
      );
    }

    // Generate path
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `${STORAGE_CONFIG.PATH_PREFIX}/${userId}/${reportId}/${order}.${extension}`;

    // Upload
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Dapatkan public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .getPublicUrl(path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      error: null,
    };
  } catch (err) {
    return {
      path: '',
      publicUrl: '',
      error: err instanceof Error ? err : new Error('Upload gagal'),
    };
  }
}

/**
 * Verifikasi object dapat diakses
 */
export async function verifyObjectExists(path: string): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(STORAGE_CONFIG.BUCKET_NAME)
    .list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop() || '',
    });

  if (error || !data || data.length === 0) return false;
  return true;
}

/**
 * Hapus file dari storage
 */
export async function deleteFile(path: string) {
  return supabase.storage.from(STORAGE_CONFIG.BUCKET_NAME).remove([path]);
}
