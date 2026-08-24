import { useState, useCallback, useEffect } from 'react';
import { getMyReports } from '@services';
import type { ReportWithDetails } from '@types';

export function useMyReports() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await getMyReports();
    if (fetchError) {
      setError(fetchError.message ?? 'Gagal memuat laporan.');
    } else {
      setReports(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const now = new Date();
  const thisMonthCount = reports.filter((r) => {
    const created = new Date(r.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return {
    reports,
    isLoading,
    error,
    refetch,
    totalCount: reports.length,
    thisMonthCount,
  };
}
