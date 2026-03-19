'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseSearchOptions {
  debounceMs?: number;
}

/**
 * Hook để quản lý trạng thái tìm kiếm với debounce
 */
export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300 } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Compute isSearching: true while a debounce is pending
  const isSearching = searchTerm !== debouncedTerm;

  // Reset search
  const resetSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    isSearching,
    resetSearch,
  };
}
