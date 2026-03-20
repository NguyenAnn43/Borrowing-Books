import { Query, Types } from 'mongoose';
import { Book, BookReview, Borrowing, Library, LibraryReview, ReviewReport } from '../models';
import { IBookReview, ILibraryReview, IReviewReport, IUser, PaginationMeta } from '../types';
import {
    AppError,
    BORROWING_STATUS,
    formatPagination,
    PAGINATION,
    REVIEW_ADMIN_ACTION,
    REVIEW_REPORT_STATUS,
    ROLES,
} from '../utils';
import {
    CreateBookReviewInput,
    CreateLibraryReviewInput,
    CreateReviewReportInput,
    GetLibrarianReviewDashboardQuery,
    GetReviewListQuery,
    GetReviewReportsQuery,
    ModerateReviewInput,
    UpdateBookReviewInput,
    UpdateLibraryReviewInput,
} from '../validators';

type ReviewType = 'book' | 'library';
type ReviewDocument = IBookReview | ILibraryReview;

interface ReviewListResult<T> {
    reviews: T[];
    pagination: PaginationMeta;
}

interface LibrarianDashboardItem {
    reviewType: ReviewType;
    reviewId: string;
    stars: number;
    comment?: string;
    images: string[];
    isHidden: boolean;
    createdAt: Date;
    user: {
        _id: string;
        fullName?: string;
        avatar?: string;
    };
    library: {
        _id: string;
        name?: string;
        code?: string;
    };
    book?: {
        _id: string;
        title?: string;
        author?: string;
        coverImage?: string;
    };
}

interface LibrarianReviewDashboardResult {
    latest: LibrarianDashboardItem[];
    lowStar: LibrarianDashboardItem[];
    withImages: LibrarianDashboardItem[];
}

interface ReviewReportListResult {
    reports: IReviewReport[];
    pagination: PaginationMeta;
}

const BORROWED_STATUSES = [
    BORROWING_STATUS.BORROWED,
    BORROWING_STATUS.RETURNED,
    BORROWING_STATUS.OVERDUE,
];

const toId = (field: Types.ObjectId | { _id: Types.ObjectId } | unknown): string => {
    if (field instanceof Types.ObjectId) return field.toString();
    if (field && typeof field === 'object' && '_id' in (field as object)) {
        return (field as { _id: Types.ObjectId })._id.toString();
    }
    return String(field);
};

const resolveReviewModel = (reviewType: ReviewType): {
    findById: (id: string) => Query<ReviewDocument | null, ReviewDocument>;
    findByIdAndDelete: (id: string) => Query<ReviewDocument | null, ReviewDocument>;
    reviewModel: 'BookReview' | 'LibraryReview';
} => {
    if (reviewType === 'book') {
        return {
            findById: (id: string) => BookReview.findById(id) as Query<ReviewDocument | null, ReviewDocument>,
            findByIdAndDelete: (id: string) => BookReview.findByIdAndDelete(id) as Query<ReviewDocument | null, ReviewDocument>,
            reviewModel: 'BookReview',
        };
    }

    return {
        findById: (id: string) => LibraryReview.findById(id) as Query<ReviewDocument | null, ReviewDocument>,
        findByIdAndDelete: (id: string) =>
            LibraryReview.findByIdAndDelete(id) as Query<ReviewDocument | null, ReviewDocument>,
        reviewModel: 'LibraryReview',
    };
};

const ensureBorrowedBook = async (userId: string, bookId: string): Promise<void> => {
    const borrowed = await Borrowing.exists({
        userId,
        bookId,
        status: { $in: BORROWED_STATUSES },
    });

    if (!borrowed) {
        throw new AppError('You can only review books you have borrowed', 403, 'BOOK_REVIEW_NOT_ALLOWED');
    }
};

const ensureBorrowedFromLibrary = async (userId: string, libraryId: string): Promise<void> => {
    const borrowed = await Borrowing.exists({
        userId,
        libraryId,
        status: { $in: BORROWED_STATUSES },
    });

    if (!borrowed) {
        throw new AppError('You can only review libraries you have borrowed from', 403, 'LIBRARY_REVIEW_NOT_ALLOWED');
    }
};

const mapDashboardItem = (reviewType: ReviewType, review: IBookReview | ILibraryReview): LibrarianDashboardItem => {
    const reviewAny = review as unknown as Record<string, unknown>;
    const user = reviewAny['userId'] as Record<string, unknown>;
    const library = reviewAny['libraryId'] as Record<string, unknown>;
    const book = reviewType === 'book' ? (reviewAny['bookId'] as Record<string, unknown>) : undefined;

    return {
        reviewType,
        reviewId: review._id.toString(),
        stars: review.stars,
        comment: review.comment || undefined,
        images: review.images,
        isHidden: review.isHidden,
        createdAt: review.createdAt,
        user: {
            _id: toId(review.userId),
            fullName: typeof user?.['fullName'] === 'string' ? user.fullName : undefined,
            avatar: typeof user?.['avatar'] === 'string' ? user.avatar : undefined,
        },
        library: {
            _id: toId(review.libraryId),
            name: typeof library?.['name'] === 'string' ? library.name : undefined,
            code: typeof library?.['code'] === 'string' ? library.code : undefined,
        },
        book: book
            ? {
                _id: toId(reviewAny['bookId']),
                title: typeof book['title'] === 'string' ? (book['title'] as string) : undefined,
                author: typeof book['author'] === 'string' ? (book['author'] as string) : undefined,
                coverImage: typeof book['coverImage'] === 'string' ? (book['coverImage'] as string) : undefined,
            }
            : undefined,
    };
};

export const getBookReviews = async (
    bookId: string,
    params: GetReviewListQuery,
    requestingUser?: IUser
): Promise<ReviewListResult<IBookReview>> => {
    const includeHidden = requestingUser?.role === ROLES.ADMIN && params.includeHidden === true;
    const page = params.page || PAGINATION.DEFAULT_PAGE;
    const limit = params.limit || PAGINATION.DEFAULT_LIMIT;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    const query: Record<string, unknown> = { bookId };
    if (!includeHidden) {
        query.isHidden = false;
    }

    const [reviews, total] = await Promise.all([
        BookReview.find(query).sort({ createdAt: -1 }).skip(skip).limit(actualLimit) as Promise<IBookReview[]>,
        BookReview.countDocuments(query),
    ]);

    return {
        reviews,
        pagination: formatPagination(page, actualLimit, total),
    };
};

export const createBookReview = async (user: IUser, data: CreateBookReviewInput): Promise<IBookReview> => {
    const book = await Book.findById(data.bookId);
    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    await ensureBorrowedBook(user._id.toString(), data.bookId);

    try {
        const review = await BookReview.create({
            userId: user._id,
            bookId: data.bookId,
            libraryId: book.libraryId,
            stars: data.stars,
            comment: data.comment,
            images: data.images || [],
        }) as IBookReview;

        return review;
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
            throw new AppError('You have already reviewed this book', 409, 'BOOK_REVIEW_EXISTS');
        }
        throw error;
    }
};

export const updateBookReview = async (
    reviewId: string,
    user: IUser,
    data: UpdateBookReviewInput
): Promise<IBookReview> => {
    const review = await BookReview.findById(reviewId) as IBookReview | null;

    if (!review) {
        throw new AppError('Review not found', 404, 'BOOK_REVIEW_NOT_FOUND');
    }

    if (toId(review.userId) !== user._id.toString()) {
        throw new AppError('You can only edit your own review', 403, 'FORBIDDEN');
    }

    if (data.stars !== undefined) review.stars = data.stars;
    if (data.comment !== undefined) review.comment = data.comment;
    if (data.images !== undefined) review.images = data.images;

    await review.save();

    return review;
};

export const deleteBookReview = async (reviewId: string, user: IUser): Promise<void> => {
    const review = await BookReview.findById(reviewId) as IBookReview | null;

    if (!review) {
        throw new AppError('Review not found', 404, 'BOOK_REVIEW_NOT_FOUND');
    }

    if (toId(review.userId) !== user._id.toString()) {
        throw new AppError('You can only delete your own review', 403, 'FORBIDDEN');
    }

    await BookReview.deleteOne({ _id: reviewId });
};

export const getLibraryReviews = async (
    libraryId: string,
    params: GetReviewListQuery,
    requestingUser?: IUser
): Promise<ReviewListResult<ILibraryReview>> => {
    const includeHidden = requestingUser?.role === ROLES.ADMIN && params.includeHidden === true;
    const page = params.page || PAGINATION.DEFAULT_PAGE;
    const limit = params.limit || PAGINATION.DEFAULT_LIMIT;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    const query: Record<string, unknown> = { libraryId };
    if (!includeHidden) {
        query.isHidden = false;
    }

    const [reviews, total] = await Promise.all([
        LibraryReview.find(query).sort({ createdAt: -1 }).skip(skip).limit(actualLimit) as Promise<ILibraryReview[]>,
        LibraryReview.countDocuments(query),
    ]);

    return {
        reviews,
        pagination: formatPagination(page, actualLimit, total),
    };
};

export const createLibraryReview = async (user: IUser, data: CreateLibraryReviewInput): Promise<ILibraryReview> => {
    const library = await Library.findById(data.libraryId);
    if (!library) {
        throw new AppError('Library not found', 404, 'LIBRARY_NOT_FOUND');
    }

    await ensureBorrowedFromLibrary(user._id.toString(), data.libraryId);

    try {
        const review = await LibraryReview.create({
            userId: user._id,
            libraryId: data.libraryId,
            stars: data.stars,
            comment: data.comment,
            images: data.images || [],
        }) as ILibraryReview;

        return review;
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
            throw new AppError('You have already reviewed this library', 409, 'LIBRARY_REVIEW_EXISTS');
        }
        throw error;
    }
};

export const updateLibraryReview = async (
    reviewId: string,
    user: IUser,
    data: UpdateLibraryReviewInput
): Promise<ILibraryReview> => {
    const review = await LibraryReview.findById(reviewId) as ILibraryReview | null;

    if (!review) {
        throw new AppError('Review not found', 404, 'LIBRARY_REVIEW_NOT_FOUND');
    }

    if (toId(review.userId) !== user._id.toString()) {
        throw new AppError('You can only edit your own review', 403, 'FORBIDDEN');
    }

    if (data.stars !== undefined) review.stars = data.stars;
    if (data.comment !== undefined) review.comment = data.comment;
    if (data.images !== undefined) review.images = data.images;

    await review.save();

    return review;
};

export const deleteLibraryReview = async (reviewId: string, user: IUser): Promise<void> => {
    const review = await LibraryReview.findById(reviewId) as ILibraryReview | null;

    if (!review) {
        throw new AppError('Review not found', 404, 'LIBRARY_REVIEW_NOT_FOUND');
    }

    if (toId(review.userId) !== user._id.toString()) {
        throw new AppError('You can only delete your own review', 403, 'FORBIDDEN');
    }

    await LibraryReview.deleteOne({ _id: reviewId });
};

export const createReviewReport = async (reporter: IUser, data: CreateReviewReportInput): Promise<IReviewReport> => {
    const { findById, reviewModel } = resolveReviewModel(data.reviewType);
    const review = await findById(data.reviewId);

    if (!review) {
        throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    if (toId(review.userId) === reporter._id.toString()) {
        throw new AppError('You cannot report your own review', 400, 'INVALID_REPORT_TARGET');
    }

    try {
        const report = await ReviewReport.create({
            reviewType: data.reviewType,
            reviewId: data.reviewId,
            reviewModel,
            reporterId: reporter._id,
            reason: data.reason,
        }) as IReviewReport;

        return report;
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
            throw new AppError('You already reported this review', 409, 'REVIEW_REPORT_EXISTS');
        }
        throw error;
    }
};

export const getReviewReports = async (params: GetReviewReportsQuery): Promise<ReviewReportListResult> => {
    const page = params.page || PAGINATION.DEFAULT_PAGE;
    const limit = params.limit || PAGINATION.DEFAULT_LIMIT;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    const query: Record<string, unknown> = {};
    if (params.status) query.status = params.status;
    if (params.reviewType) query.reviewType = params.reviewType;

    const [reports, total] = await Promise.all([
        ReviewReport.find(query)
            .populate('reviewId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(actualLimit) as Promise<IReviewReport[]>,
        ReviewReport.countDocuments(query),
    ]);

    return {
        reports,
        pagination: formatPagination(page, actualLimit, total),
    };
};

export const moderateReview = async (admin: IUser, data: ModerateReviewInput): Promise<void> => {
    const { findById, findByIdAndDelete } = resolveReviewModel(data.reviewType);
    const now = new Date();

    if (data.action === REVIEW_ADMIN_ACTION.DELETE) {
        const deletion = await findByIdAndDelete(data.reviewId);
        if (!deletion) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }
    } else {
        const review = await findById(data.reviewId);
        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        if (data.action === REVIEW_ADMIN_ACTION.HIDE) {
            review.isHidden = true;
            review.hiddenBy = admin._id;
            review.hiddenAt = now;
            review.hiddenReason = data.note || 'Hidden by admin moderation';
        }

        if (data.action === REVIEW_ADMIN_ACTION.KEEP) {
            review.isHidden = false;
            review.hiddenBy = undefined;
            review.hiddenAt = undefined;
            review.hiddenReason = undefined;
        }

        await review.save();
    }

    await ReviewReport.updateMany(
        {
            reviewType: data.reviewType,
            reviewId: data.reviewId,
            status: REVIEW_REPORT_STATUS.PENDING,
        },
        {
            $set: {
                status: REVIEW_REPORT_STATUS.RESOLVED,
                adminAction: data.action,
                adminNote: data.note || null,
                resolvedBy: admin._id,
                resolvedAt: now,
            },
        }
    );
};

export const getLibrarianReviewDashboard = async (
    librarian: IUser,
    query: GetLibrarianReviewDashboardQuery
): Promise<LibrarianReviewDashboardResult> => {
    if (!librarian.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const limit = Math.min(query.limit || 10, 30);
    const libraryId = librarian.libraryId;

    const [latestBook, latestLibrary, lowBook, lowLibrary, imageBook, imageLibrary] = await Promise.all([
        BookReview.find({ libraryId, isHidden: false }).sort({ createdAt: -1 }).limit(limit) as Promise<IBookReview[]>,
        LibraryReview.find({ libraryId, isHidden: false }).sort({ createdAt: -1 }).limit(limit) as Promise<ILibraryReview[]>,
        BookReview.find({ libraryId, stars: { $lte: 2 }, isHidden: false }).sort({ createdAt: -1 }).limit(limit) as Promise<IBookReview[]>,
        LibraryReview.find({ libraryId, stars: { $lte: 2 }, isHidden: false }).sort({ createdAt: -1 }).limit(limit) as Promise<ILibraryReview[]>,
        BookReview.find({ libraryId, 'images.0': { $exists: true }, isHidden: false })
            .sort({ createdAt: -1 })
            .limit(limit) as Promise<IBookReview[]>,
        LibraryReview.find({ libraryId, 'images.0': { $exists: true }, isHidden: false })
            .sort({ createdAt: -1 })
            .limit(limit) as Promise<ILibraryReview[]>,
    ]);

    const latest = [
        ...latestBook.map((review) => mapDashboardItem('book', review)),
        ...latestLibrary.map((review) => mapDashboardItem('library', review)),
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

    const lowStar = [
        ...lowBook.map((review) => mapDashboardItem('book', review)),
        ...lowLibrary.map((review) => mapDashboardItem('library', review)),
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

    const withImages = [
        ...imageBook.map((review) => mapDashboardItem('book', review)),
        ...imageLibrary.map((review) => mapDashboardItem('library', review)),
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

    return {
        latest,
        lowStar,
        withImages,
    };
};
