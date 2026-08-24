import { useState, useCallback, useEffect } from 'react';
import { getActiveAnnouncements } from '@services';
import type { Announcement } from '@types';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await getActiveAnnouncements();
    if (fetchError) {
      setError(fetchError.message ?? 'Gagal memuat pengumuman.');
    } else {
      setAnnouncements(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { announcements, isLoading, error, refetch };
}
