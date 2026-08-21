import { useState, useEffect, useCallback } from 'react';
import { checkReportEligibility, AuthCheckResult } from '@services';

export function useEligibility() {
  const [result, setResult] = useState<AuthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const checkResult = await checkReportEligibility();
      setResult(checkResult);
      if (checkResult.error) {
        setError(checkResult.error);
      }
      return checkResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memeriksa kelayakan';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return {
    ...result,
    isLoading,
    error,
    refetch: check,
  };
}
