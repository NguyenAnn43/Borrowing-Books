import mongoose, { Types } from 'mongoose';
import { Borrowing, Book, User } from '../models';
import * as notificationService from './notificationService';
import * as bookService from './bookService';
import {
    AppError, formatPagination, generateDueDate, calculateOverdueDays, calculateFine,
    BORROWING_STATUS, BORROWING_SETTINGS, PAGINATION, NOTIFICATION_TYPE,
} from '../utils';
import { IBorrowing, IBook, IUser, PaginationMeta } from '../types';
import { GetBorrowingsQuery, CreateBorrowingInput } from '../validators/borrowingSchema';
import { ROLES } from '../utils/constants';

interface GetBorrowingsResult {
    borrowings: IBorrowing[];
    pagination: PaginationMeta;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Extract string ID from populated or raw ObjectId field */
const toId = (field: Types.ObjectId | { _id: Types.ObjectId } | unknown): string => {
    if (field instanceof Types.ObjectId) return field.toString();
    if (field && typeof field === 'object' && '_id' in (field as object)) {
        return (field as { _id: Types.ObjectId })._id.toString();
    }
    return String(field);
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get all borrowings with pagination and filters (admin/librarian)
 */
export const getBorrowings = async (params: GetBorrowingsQuery): Promise<GetBorrowingsResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, libraryId, userId } = params;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (libraryId) query.libraryId = libraryId;
    if (userId) query.userId = userId;

    const skip = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query).skip(skip).limit(actualLimit).sort({ createdAt: -1 }) as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return { borrowings, pagination: formatPagination(page, actualLimit, total) };
};

/**
 * Get user's own borrowings
 */
export const getMyBorrowings = async (
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {}
): Promise<GetBorrowingsResult> => {
    const { page = 1, limit = 10, status } = params;
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }) as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return { borrowings, pagination: formatPagination(page, limit, total) };
};

/**
 * Get borrowing by ID — enforces ownership: owner | librarian | admin only.
 */
export const getBorrowingById = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;

    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    const isOwner = toId(borrowing.userId) === requestingUser._id.toString();
    const isLibrarianOrAdmin = (requestingUser.role === ROLES.LIBRARIAN || requestingUser.role === ROLES.ADMIN);

    if (!isOwner && !isLibrarianOrAdmin) {
        throw new AppError('You are not authorized to view this borrowing', 403, 'FORBIDDEN');
    }

    return borrowing;
};

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create borrowing request — validates libraryId belongs to the book.
 */
export const createBorrowing = async (userId: string, data: CreateBorrowingInput): Promise<IBorrowing> => {
    const { bookId, libraryId, notes } = data;

    const book = await Book.findById(bookId) as IBook | null;
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    // [P0] libraryId must match the book's library
    if (book.libraryId.toString() !== libraryId) {
        throw new AppError(
            'The provided libraryId does not match the book\'s library',
            400,
            'LIBRARY_MISMATCH'
        );
    }

    if (book.availableCopies <= 0) {
        throw new AppError('Book is not available', 400, 'BOOK_UNAVAILABLE');
    }

    const user = await User.findById(userId) as IUser | null;
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const activeBorrowings = await Borrowing.countDocuments({
        userId,
        status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
    });

    if (activeBorrowings >= user.maxBorrowLimit) {
        throw new AppError(
            `You have reached your borrow limit (${user.maxBorrowLimit})`,
            400,
            'BORROW_LIMIT_REACHED'
        );
    }

    const existingBorrowing = await Borrowing.findOne({
        userId,
        bookId,
        status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
    });
    if (existingBorrowing) {
        throw new AppError('You already have this book borrowed', 400, 'ALREADY_BORROWED');
    }

    const dueDate = generateDueDate(new Date(), BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);
    const borrowing = await Borrowing.create({ userId, bookId, libraryId, dueDate, notes, status: BORROWING_STATUS.PENDING }) as IBorrowing;

    await notificationService.create({
        userId,
        title: 'Borrowing Request Created',
        message: `Your request to borrow "${book.title}" has been submitted.`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Confirm book pickup (librarian action).
 * Uses a Mongoose transaction to atomically decrement stock and flip Borrowing status.
 */
export const confirmPickup = async (id: string): Promise<IBorrowing> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
        if (borrowing.status !== BORROWING_STATUS.PENDING) {
            throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
        }

        // [P0] Atomic decrement — throws BOOK_UNAVAILABLE if no copies left
        await bookService.decrementAvailabilityAtomic(toId(borrowing.bookId), session);

        const now = new Date();
        borrowing.status = BORROWING_STATUS.BORROWED;
        borrowing.borrowDate = now;
        borrowing.dueDate = generateDueDate(now, BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);
        await borrowing.save({ session });

        await session.commitTransaction();

        // Notification outside transaction (non-critical)
        await notificationService.create({
            userId: toId(borrowing.userId),
            title: 'Book Picked Up',
            message: `You have picked up the book. Due date: ${borrowing.dueDate.toLocaleDateString('vi-VN')}`,
            type: NOTIFICATION_TYPE.BORROWING,
        });

        return borrowing;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

/**
 * Record book return (librarian action).
 * Uses a Mongoose transaction to atomically restore stock and finalize Borrowing.
 */
export const returnBook = async (id: string): Promise<IBorrowing> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
        if (borrowing.status !== BORROWING_STATUS.BORROWED && borrowing.status !== BORROWING_STATUS.OVERDUE) {
            throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
        }

        const overdueDays = calculateOverdueDays(borrowing.dueDate);
        if (overdueDays > 0) {
            borrowing.fineAmount = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
            borrowing.isFined = true;
        }

        const now = new Date();
        borrowing.status = BORROWING_STATUS.RETURNED;
        borrowing.actualReturnDate = now;
        // returnDate is mirrored automatically in pre-save hook
        await borrowing.save({ session });

        // [P0] Atomic increment — same transaction
        await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId), session);

        await session.commitTransaction();

        // Notification outside transaction
        let message = 'You have returned the book.';
        if (borrowing.isFined) {
            message += ` Fine amount: ${borrowing.fineAmount.toLocaleString('vi-VN')} VND. Please pay at the library.`;
        }
        await notificationService.create({
            userId: toId(borrowing.userId),
            title: 'Book Returned',
            message,
            type: NOTIFICATION_TYPE.BORROWING,
        });

        return borrowing;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

// ─── P1 — New Borrowing Actions ──────────────────────────────────────────────

/**
 * Cancel a pending borrowing request (owner only).
 */
export const cancelBorrowing = async (id: string, userId: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    if (toId(borrowing.userId) !== userId) {
        throw new AppError('You are not authorized to cancel this borrowing', 403, 'FORBIDDEN');
    }

    if (borrowing.status !== BORROWING_STATUS.PENDING) {
        throw new AppError('Only pending borrowings can be cancelled', 400, 'INVALID_STATUS');
    }

    borrowing.status = BORROWING_STATUS.CANCELLED;
    await borrowing.save();

    await notificationService.create({
        userId,
        title: 'Borrowing Cancelled',
        message: 'Your borrowing request has been cancelled.',
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Renew an active borrowing (owner only).
 * Extends dueDate by BORROWING_SETTINGS.RENEWAL_DAYS.
 */
export const renewBorrowing = async (id: string, userId: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    if (toId(borrowing.userId) !== userId) {
        throw new AppError('You are not authorized to renew this borrowing', 403, 'FORBIDDEN');
    }

    if (borrowing.status !== BORROWING_STATUS.BORROWED) {
        throw new AppError('Only active borrowings can be renewed', 400, 'INVALID_STATUS');
    }

    if (borrowing.renewalCount >= borrowing.maxRenewals) {
        throw new AppError(
            `Maximum renewal limit (${borrowing.maxRenewals}) reached`,
            400,
            'MAX_RENEWALS_REACHED'
        );
    }

    borrowing.dueDate = generateDueDate(borrowing.dueDate, BORROWING_SETTINGS.RENEWAL_DAYS);
    borrowing.renewalCount += 1;
    await borrowing.save();

    await notificationService.create({
        userId,
        title: 'Borrowing Renewed',
        message: `Your borrowing has been renewed. New due date: ${borrowing.dueDate.toLocaleDateString('vi-VN')}`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Mark a borrowing's fine as paid (librarian/admin only).
 */
export const payFine = async (id: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    if (!borrowing.isFined) {
        throw new AppError('This borrowing has no outstanding fine', 400, 'NO_FINE');
    }

    if (borrowing.finePaid) {
        throw new AppError('Fine has already been paid', 400, 'FINE_ALREADY_PAID');
    }

    borrowing.finePaid = true;
    await borrowing.save();

    await notificationService.create({
        userId: toId(borrowing.userId),
        title: 'Fine Paid',
        message: `Your fine of ${borrowing.fineAmount.toLocaleString('vi-VN')} VND has been recorded as paid.`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Bulk-update overdue borrowings (called by scheduler).
 * Returns the count of borrowings updated.
 */
export const checkAndMarkOverdue = async (): Promise<number> => {
    const result = await Borrowing.updateMany(
        {
            status: BORROWING_STATUS.BORROWED,
            dueDate: { $lt: new Date() },
        },
        [
            {
                $set: {
                    status: BORROWING_STATUS.OVERDUE,
                    isFined: true,
                    fineAmount: {
                        $multiply: [
                            {
                                $ceil: {
                                    $divide: [
                                        { $subtract: [new Date(), '$dueDate'] },
                                        1000 * 60 * 60 * 24,
                                    ],
                                },
                            },
                            BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY,
                        ],
                    },
                },
            },
        ]
    );
    return result.modifiedCount;
};
