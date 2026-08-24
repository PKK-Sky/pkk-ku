/**
 * Hook untuk memilih foto dari kamera/galeri dan crop.
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { CroppedImage } from '../types/form';
import { STORAGE_CONFIG } from '@constants';

export function useImagePicker() {
  const [images, setImages] = useState<CroppedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return {
      camera: cameraStatus === ImagePicker.PermissionStatus.GRANTED,
      library: libraryStatus === ImagePicker.PermissionStatus.GRANTED,
    };
  }, []);

  const pickFromCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const cropped = await processImage(asset.uri, asset.width, asset.height);
        if (cropped) {
          setImages((prev) => [...prev, cropped]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil foto');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const cropped = await processImage(asset.uri, asset.width, asset.height);
        if (cropped) {
          setImages((prev) => [...prev, cropped]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memilih foto');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
  }, []);

  return {
    images,
    isLoading,
    error,
    requestPermission,
    pickFromCamera,
    pickFromLibrary,
    removeImage,
    clearImages,
    canAddMore: images.length < STORAGE_CONFIG.MAX_IMAGES_PER_REPORT,
  };
}

/**
 * Proses image: crop, resize, dan simpan metadata crop.
 */
async function processImage(
  uri: string,
  originalWidth: number,
  originalHeight: number
): Promise<CroppedImage | null> {
  try {
    // Crop ke aspect ratio 4:3 (atau sesuai kebutuhan)
    const targetAspect = 4 / 3;
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;
    let cropX = 0;
    let cropY = 0;

    const currentAspect = originalWidth / originalHeight;

    if (currentAspect > targetAspect) {
      // Terlalu lebar, crop sisi kiri-kanan
      cropWidth = originalHeight * targetAspect;
      cropX = (originalWidth - cropWidth) / 2;
    } else {
      // Terlalu tinggi, crop atas-bawah
      cropHeight = originalWidth / targetAspect;
      cropY = (originalHeight - cropHeight) / 2;
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: Math.round(cropX),
            originY: Math.round(cropY),
            width: Math.round(cropWidth),
            height: Math.round(cropHeight),
          },
        },
        { resize: { width: 1200 } }, // Resize untuk konsistensi
      ],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileInfo = await fetch(manipResult.uri).then((r) => r.blob());

    return {
      uri: manipResult.uri,
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
      cropX: Math.round(cropX),
      cropY: Math.round(cropY),
      cropWidth: Math.round(cropWidth),
      cropHeight: Math.round(cropHeight),
      mimeType: 'image/jpeg',
      fileSize: fileInfo.size,
    };
  } catch {
    return null;
  }
}
