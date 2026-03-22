import api, { ApiResponse } from '@/lib/api';
import type {
    IBookReview,
    ILibraryReview,
    ILibrarianReviewDashboard,
    IPagination,
    IReviewReport,
} from '@/types';

interface ReviewListParams {
    page?: number;
    limit?: number;
    includeHidden?: boolean;
}

interface CreateReviewPayload {
    stars: number;
    comment?: string;
    images?: string[];
    agreedToGuidelines: true;
}

interface CreateReviewReportPayload {
    reviewType: 'book' | 'library';
    reviewId: string;
    reason: string;
}

interface ModerateReviewPayload {
    reviewType: 'book' | 'library';
    reviewId: string;
    action: 'keep' | 'hide';
    note?: string;
}

export const reviewService = {
    getBookReviews: async (bookId: string, params: ReviewListParams = {}) => {
        const response = await api.get<ApiResponse<IBookReview[]>>(`/reviews/books/${bookId}`, { params });
        return {
            reviews: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    createBookReview: async (bookId: string, payload: CreateReviewPayload): Promise<IBookReview> => {
        const response = await api.post<ApiResponse<IBookReview>>('/reviews/books', {
            bookId,
            ...payload,
        });
        return response.data.data;
    },

    updateBookReview: async (reviewId: string, payload: Partial<CreateReviewPayload>): Promise<IBookReview> => {
        const response = await api.put<ApiResponse<IBookReview>>(`/reviews/books/${reviewId}`, payload);
        return response.data.data;
    },

    deleteBookReview: async (reviewId: string): Promise<void> => {
        await api.delete(`/reviews/books/${reviewId}`);
    },

    getLibraryReviews: async (libraryId: string, params: ReviewListParams = {}) => {
        const response = await api.get<ApiResponse<ILibraryReview[]>>(`/reviews/libraries/${libraryId}`, { params });
        return {
            reviews: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    createLibraryReview: async (libraryId: string, payload: CreateReviewPayload): Promise<ILibraryReview> => {
        const response = await api.post<ApiResponse<ILibraryReview>>('/reviews/libraries', {
            libraryId,
            ...payload,
        });
        return response.data.data;
    },

    updateLibraryReview: async (reviewId: string, payload: Partial<CreateReviewPayload>): Promise<ILibraryReview> => {
        const response = await api.put<ApiResponse<ILibraryReview>>(`/reviews/libraries/${reviewId}`, payload);
        return response.data.data;
    },

    deleteLibraryReview: async (reviewId: string): Promise<void> => {
        await api.delete(`/reviews/libraries/${reviewId}`);
    },

    reportReview: async (payload: CreateReviewReportPayload): Promise<IReviewReport> => {
        const response = await api.post<ApiResponse<IReviewReport>>('/reviews/reports', payload);
        return response.data.data;
    },

    getReviewReports: async (params: {
        status?: 'pending' | 'resolved';
        reviewType?: 'book' | 'library';
        page?: number;
        limit?: number;
    } = {}) => {
        const response = await api.get<ApiResponse<IReviewReport[]>>('/reviews/reports', { params });
        return {
            reports: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    moderateReview: async (payload: ModerateReviewPayload): Promise<void> => {
        await api.put('/reviews/moderate', payload);
    },

    uploadReviewImages: async (files: File[]): Promise<string[]> => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        const response = await api.post<ApiResponse<string[]>>('/reviews/images', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.data;
    },

    getLibrarianReviewDashboard: async (limit = 10): Promise<ILibrarianReviewDashboard> => {
        const response = await api.get<ApiResponse<ILibrarianReviewDashboard>>('/reviews/dashboard/librarian', {
            params: { limit },
        });
        return response.data.data;
    },

    getMyReviews: async () => {
        const response = await api.get<ApiResponse<{ bookReviews: IBookReview[]; libraryReviews: ILibraryReview[] }>>('/reviews/my');
        return response.data.data;
    },
};
