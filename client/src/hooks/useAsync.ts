'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseAsyncOptions<T> {
  data?: T;
  onError?: (error: Error) => void;
}

interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook để quản lý async operations
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: unknown[] = [],
  options: UseAsyncOptions<T> = {}
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: options.data ?? null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const result = await asyncFunction();
      setState({ data: result, isLoading: false, error: null });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, isLoading: false, error: err });
      options.onError?.(err);
      throw err;
    }
  }, [asyncFunction, options]);

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    ...state,
    execute,
  };
}
