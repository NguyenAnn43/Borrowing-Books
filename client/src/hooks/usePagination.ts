'use client';

import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UsePaginationOptions {
  initialPage?: number;
  defaultLimit?: number;
}

/**
 * Hook để quản lý trạng thái phân trang
 * @param options - Các tùy chọn ban đầu
 * @returns Đối tượng chứa trạng thái và hàm quản lý phân trang
 */
export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, defaultLimit = 10 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: defaultLimit,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Cập nhật metadata phân trang từ API response
  const updatePagination = useCallback((meta: Partial<PaginationState>) => {
    setPagination((prev) => ({
      ...prev,
      ...meta,
    }));
  }, []);

  // Chuyển đến trang đầu tiên
  const resetPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  // Tăng trang hiện tại
  const nextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.pages),
    }));
  }, []);

  // Giảm trang hiện tại
  const prevPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  // Chuyển đến trang cụ thể
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.pages || page)),
    }));
  }, []);

  // Cập nhật limit (số mục trên mỗi trang)
  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit,
      page: 1, // Reset about page 1 when limit changes
    }));
  }, []);

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    pages: pagination.pages,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
    // Getters
    pagination,
    // Actions
    updatePagination,
    resetPage,
    nextPage,
    prevPage,
    goToPage,
    setLimit,
  };
}
