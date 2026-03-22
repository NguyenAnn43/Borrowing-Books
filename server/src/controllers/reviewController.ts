import { Response } from 'express';
import { asyncHandler, AppError } from '../utils';
import { AuthRequest } from '../types';
import { reviewService } from '../services';
import {
    GetLibrarianReviewDashboardQuery,
    GetReviewListQuery,
    GetReviewReportsQuery,
} from '../validators';

export const getBookReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await reviewService.getBookReviews(
        req.params['bookId']!,
        req.query as unknown as GetReviewListQuery,
        req.user
    );

    res.json({
        success: true,
        data: result.reviews,
        meta: result.pagination,
    });
});

export const createBookReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review = await reviewService.createBookReview(req.user!, req.body);

    res.status(201).json({
        success: true,
        data: review,
        message: 'Book review created successfully',
    });
});

export const updateBookReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review = await reviewService.updateBookReview(req.params['reviewId']!, req.user!, req.body);

    res.json({
        success: true,
        data: review,
        message: 'Book review updated successfully',
    });
});

export const deleteBookReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    await reviewService.deleteBookReview(req.params['reviewId']!, req.user!);

    res.json({
        success: true,
        message: 'Book review deleted successfully',
    });
});

export const getLibraryReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await reviewService.getLibraryReviews(
        req.params['libraryId']!,
        req.query as unknown as GetReviewListQuery,
        req.user
    );

    res.json({
        success: true,
        data: result.reviews,
        meta: result.pagination,
    });
});

export const createLibraryReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review = await reviewService.createLibraryReview(req.user!, req.body);

    res.status(201).json({
        success: true,
        data: review,
        message: 'Library review created successfully',
    });
});

export const updateLibraryReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review = await reviewService.updateLibraryReview(req.params['reviewId']!, req.user!, req.body);

    res.json({
        success: true,
        data: review,
        message: 'Library review updated successfully',
    });
});

export const deleteLibraryReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    await reviewService.deleteLibraryReview(req.params['reviewId']!, req.user!);

    res.json({
        success: true,
        message: 'Library review deleted successfully',
    });
});

export const createReviewReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await reviewService.createReviewReport(req.user!, req.body);

    res.status(201).json({
        success: true,
        data: report,
        message: 'Review report submitted successfully',
    });
});

export const getReviewReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await reviewService.getReviewReports(req.query as unknown as GetReviewReportsQuery);

    res.json({
        success: true,
        data: result.reports,
        meta: result.pagination,
    });
});

export const moderateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    await reviewService.moderateReview(req.user!, req.body);

    res.json({
        success: true,
        message: 'Review moderated successfully',
    });
});

export const getLibrarianReviewDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dashboard = await reviewService.getLibrarianReviewDashboard(
        req.user!,
        req.query as unknown as GetLibrarianReviewDashboardQuery
    );

    res.json({
        success: true,
        data: dashboard,
    });
});

export const uploadImages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
        throw new AppError('No image files provided', 400, 'NO_FILES_PROVIDED');
    }

    const imageUrls = files.map(file => {
        return `${req.protocol}://${req.get('host')}/uploads/reviews/${file.filename}`;
    });

    res.json({
        success: true,
        data: imageUrls,
        message: 'Images uploaded successfully',
    });
});

export const getMyReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id.toString();
    const data = await reviewService.getMyReviews(userId);

    res.json({
        success: true,
        data,
    });
});
