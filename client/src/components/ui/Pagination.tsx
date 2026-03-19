'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showInfo?: boolean;
  showLimitSelector?: boolean;
  limitOptions?: number[];
  className?: string;
}

/**
 * Pagination component - hiển thị điều khiển phân trang
 */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  showInfo = true,
  showLimitSelector = false,
  limitOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  if (pages <= 1 && !showLimitSelector) {
    return null;
  }

  // Tính toán mức bdo của items trên trang hiện tại
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Tạo danh sách số trang để hiển thị
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < pages - 1) {
      rangeWithDots.push('...', pages);
    } else if (pages > 1) {
      rangeWithDots.push(pages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Thông tin phân trang */}
      {showInfo && total > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Hiển thị <span className="font-medium text-gray-900 dark:text-gray-100">{startItem}</span> đến{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{endItem}</span> trong{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span> kết quả
        </div>
      )}

      {/* Limit selector */}
      {showLimitSelector && (
        <div className="flex items-center gap-2">
          <label htmlFor="limit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Hiển thị:
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Điều khiển phân trang */}
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {/* First page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title="Trang đầu"
            className="h-9 w-9 !p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            title="Trang trước"
            className="h-9 w-9 !p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum, index) => (
              <React.Fragment key={index}>
                {pageNum === '...' ? (
                  <span className="px-2 py-1 text-gray-600 dark:text-gray-400">...</span>
                ) : (
                  <Button
                    variant={pageNum === page ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum as number)}
                    className="h-9 min-w-9 !p-0"
                  >
                    {pageNum}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === pages}
            title="Trang tiếp"
            className="h-9 w-9 !p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pages)}
            disabled={page === pages}
            title="Trang cuối"
            className="h-9 w-9 !p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
