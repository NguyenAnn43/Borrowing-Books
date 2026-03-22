import mongoose, { Types } from 'mongoose';
import config from '../config/env';
import { Borrowing, Book, Notification, Payment, User } from '../models';
import * as notificationService from './notificationService';
import * as bookService from './bookService';
import * as reservationService from './reservationService';
import { sendEmail } from './mailService';
import logger from '../utils/logger';
import {
    AppError, formatPagination, generateDueDate, calculateOverdueDays, calculateFine,
    BORROWING_STATUS, BORROWING_SETTINGS, PAGINATION, NOTIFICATION_TYPE,
} from '../utils';
import { IBorrowing, IBook, IUser, PaginationMeta } from '../types';
import { GetBorrowingsQuery, CreateBorrowingInput, CreateBulkBorrowingInput, CrossReturnLookupQuery } from '../validators/borrowingSchema';
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

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get all borrowings with pagination and filters (admin/librarian)
 * Librarians can only see borrowings for their own library
 */
export const getBorrowings = async (params: GetBorrowingsQuery, requestingUser: IUser): Promise<GetBorrowingsResult> => {
    // Librarians must be assigned to a library
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const { q, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, finePaid, libraryId, userId } = params;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (finePaid === 'true') {
        query.finePaid = true;
    } else if (finePaid === 'false') {
        query.finePaid = false;
    }

    // Librarians can only view borrowings for their own library
    if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
        query.libraryId = requestingUser.libraryId;
    } else if (libraryId && requestingUser.role === ROLES.ADMIN) {
        // Only admins can filter by different libraries
        query.libraryId = libraryId;
    }

    // Add search by book title or user name
    if (q) {
        const normalizedQ = q.trim();
        if (!normalizedQ) {
            const [borrowings, total] = await Promise.all([
                Borrowing.find(query)
                    .skip((page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT))
                    .limit(Math.min(limit, PAGINATION.MAX_LIMIT))
                    .sort({ createdAt: -1 })
                    .populate('bookId', 'title author')
                    .populate('userId', 'fullName email')
                    .populate('libraryId', 'name code') as Promise<IBorrowing[]>,
                Borrowing.countDocuments(query),
            ]);

            const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
            return { borrowings, pagination: formatPagination(page, actualLimit, total) };
        }
        const isObjectIdQuery = Types.ObjectId.isValid(normalizedQ);
        const safeRegex = { $regex: escapeRegex(normalizedQ), $options: 'i' };

        const [matchingBooks, matchingUsers] = await Promise.all([
            Book.find({ $or: [{ title: safeRegex }, { author: safeRegex }, { isbn: safeRegex }] }).select('_id'),
            User.find({ $or: [{ fullName: safeRegex }, { email: safeRegex }] }).select('_id'),
        ]);

        const orConditions: Record<string, unknown>[] = [];

        if (isObjectIdQuery) {
            const objectId = new Types.ObjectId(normalizedQ);
            orConditions.push({ _id: objectId });
            orConditions.push({ bookId: objectId });
            orConditions.push({ userId: objectId });
        }

        if (matchingBooks.length > 0) {
            orConditions.push({ bookId: { $in: matchingBooks.map((book) => book._id) } });
        }
        if (matchingUsers.length > 0) {
            orConditions.push({ userId: { $in: matchingUsers.map((user) => user._id) } });
        }

        if (orConditions.length === 0) {
            return { borrowings: [], pagination: formatPagination(page, limit, 0) };
        }

        query.$or = orConditions;
    }

    const skip = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query)
            .skip(skip)
            .limit(actualLimit)
            .sort({ createdAt: -1 })
            .populate('bookId', 'title author')
            .populate('userId', 'fullName email')
            .populate('libraryId', 'name code') as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return { borrowings, pagination: formatPagination(page, actualLimit, total) };
};

/**
 * Search active borrowings from other libraries so a librarian can receive cross-library returns.
 */
export const lookupCrossLibraryReturnCandidates = async (
    params: CrossReturnLookupQuery,
    requestingUser: IUser
): Promise<IBorrowing[]> => {
    if (requestingUser.role !== ROLES.LIBRARIAN) {
        throw new AppError('Only librarians can lookup cross-library returns', 403, 'FORBIDDEN');
    }
    if (!requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const q = params.q.trim();
    const queryLimit = Number.isFinite(params.limit) ? params.limit : PAGINATION.DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(queryLimit, 20));

    const baseQuery: Record<string, unknown> = {
        status: { $in: [BORROWING_STATUS.BORROWED, BORROWING_STATUS.OVERDUE] },
        libraryId: { $ne: requestingUser.libraryId },
    };

    const queryParts: Record<string, unknown>[] = [];

    if (Types.ObjectId.isValid(q)) {
        queryParts.push({ _id: new Types.ObjectId(q) });
    }

    const safeRegex = { $regex: escapeRegex(q), $options: 'i' };
    const [matchingBooks, matchingUsers] = await Promise.all([
        Book.find({ $or: [{ title: safeRegex }, { author: safeRegex }, { isbn: safeRegex }] }).select('_id'),
        User.find({ $or: [{ fullName: safeRegex }, { email: safeRegex }] }).select('_id'),
    ]);

    if (matchingBooks.length > 0) {
        queryParts.push({ bookId: { $in: matchingBooks.map((book) => book._id) } });
    }
    if (matchingUsers.length > 0) {
        queryParts.push({ userId: { $in: matchingUsers.map((user) => user._id) } });
    }

    if (queryParts.length === 0) {
        return [];
    }

    const borrowings = await Borrowing.find({
        ...baseQuery,
        $or: queryParts,
    })
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(limit) as IBorrowing[];

    return borrowings;
};

/**
 * Get user's own borrowings
 */
export const getMyBorrowings = async (
    userId: string,
    params: { page?: number; limit?: number; status?: string; finePaid?: string | boolean; q?: string } = {}
): Promise<GetBorrowingsResult> => {
    const { page = 1, limit = 10, status, finePaid, q } = params;
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;
    if (typeof finePaid === 'boolean') {
        query.finePaid = finePaid;
    } else if (finePaid === 'true') {
        query.finePaid = true;
    } else if (finePaid === 'false') {
        query.finePaid = false;
    }

    if (q) {
        const normalizedQ = q.trim();
        if (normalizedQ) {
            const isObjectIdQuery = Types.ObjectId.isValid(normalizedQ);
            const safeRegex = { $regex: escapeRegex(normalizedQ), $options: 'i' };

            const matchingBooks = await Book.find({
                $or: [{ title: safeRegex }, { author: safeRegex }, { isbn: safeRegex }],
            }).select('_id');

            const orConditions: Record<string, unknown>[] = [];

            if (isObjectIdQuery) {
                const objectId = new Types.ObjectId(normalizedQ);
                orConditions.push({ _id: objectId });
                orConditions.push({ bookId: objectId });
            }

            if (matchingBooks.length > 0) {
                orConditions.push({ bookId: { $in: matchingBooks.map((book) => book._id) } });
            }

            if (orConditions.length === 0) {
                return { borrowings: [], pagination: formatPagination(page, limit, 0) };
            }

            query.$or = orConditions;
        }
    }

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

    // Check if user has outstanding fines
    if (user.isFined) {
        throw new AppError(
            'You have outstanding fines. Please pay all pending fines before borrowing more books.',
            400,
            'USER_HAS_FINES'
        );
    }

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
        title: 'Yêu cầu mượn sách',
        message: `Yêu cầu mượn "${book.title}" đã được gửi thành công.`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Create bulk borrowing request for multiple books at once.
 */
export const createBulkBorrowing = async (userId: string, data: CreateBulkBorrowingInput): Promise<IBorrowing[]> => {
    const { bookIds, libraryId, notes } = data;

    // Remove duplicate book IDs if any
    const uniqueBookIds = [...new Set(bookIds)];

    const user = await User.findById(userId) as IUser | null;
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    // Check if user has outstanding fines
    if (user.isFined) {
        throw new AppError(
            'You have outstanding fines. Please pay all pending fines before borrowing more books.',
            400,
            'USER_HAS_FINES'
        );
    }

    const activeBorrowingsCount = await Borrowing.countDocuments({
        userId,
        status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
    });

    if (activeBorrowingsCount + uniqueBookIds.length > user.maxBorrowLimit) {
        throw new AppError(
            `Bulk request exceeds your borrow limit. You can only borrow ${user.maxBorrowLimit - activeBorrowingsCount} more book(s).`,
            400,
            'BORROW_LIMIT_REACHED'
        );
    }

    const books = await Book.find({ _id: { $in: uniqueBookIds } }) as IBook[];
    if (books.length !== uniqueBookIds.length) {
        throw new AppError('One or more books not found', 404, 'BOOK_NOT_FOUND');
    }

    // Validate all books
    for (const book of books) {
        if (book.libraryId.toString() !== libraryId) {
            throw new AppError(
                `Book "${book.title}" is not available at the selected library`,
                400,
                'LIBRARY_MISMATCH'
            );
        }
        if (book.availableCopies <= 0) {
            throw new AppError(`Book "${book.title}" is not available`, 400, 'BOOK_UNAVAILABLE');
        }
    }

    const existingBorrowings = await Borrowing.find({
        userId,
        bookId: { $in: uniqueBookIds },
        status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
    });

    if (existingBorrowings.length > 0) {
        throw new AppError('You already have one or more of these books borrowed or pending', 400, 'ALREADY_BORROWED');
    }

    const dueDate = generateDueDate(new Date(), BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);

    const borrowingsToCreate = uniqueBookIds.map(bookId => ({
        userId,
        bookId,
        libraryId,
        dueDate,
        notes,
        status: BORROWING_STATUS.PENDING
    }));

    const session = await mongoose.startSession();
    session.startTransaction();

    let borrowings: IBorrowing[];
    try {
        borrowings = await Borrowing.insertMany(borrowingsToCreate, { session }) as unknown as IBorrowing[];
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    await notificationService.create({
        userId,
        title: 'Yêu cầu mượn sách',
        message: `Yêu cầu mượn ${borrowings.length} cuốn sách đã được gửi thành công.`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowings;
};

/**
 * Confirm book pickup (librarian action).
 * Uses a Mongoose transaction to atomically decrement stock and flip Borrowing status.
 */
export const confirmPickup = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    // Librarians must be assigned to a library
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

        // Librarians can only manage borrowings for their own library
        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
            }
        }

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
            title: 'Nhận sách thành công',
            message: `Bạn đã nhận sách. Hạn trả: ${borrowing.dueDate.toLocaleDateString('vi-VN')}`,
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
 * Librarians can only process returns for borrowings in their library.
 */
export const returnBook = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    // Librarians must be assigned to a library
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

        // Standard return route is for home library only.
        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError(
                    'Cross-library return must be handled via receiveCrossLibraryReturn',
                    403,
                    'FORBIDDEN'
                );
            }
        }

        if (borrowing.status !== BORROWING_STATUS.BORROWED && borrowing.status !== BORROWING_STATUS.OVERDUE) {
            throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
        }

        const overdueDays = calculateOverdueDays(borrowing.dueDate);
        if (overdueDays > 0) {
            borrowing.fineAmount = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
            borrowing.isFined = true;
            // Update user.isFined flag when book is returned late
            await User.findByIdAndUpdate(borrowing.userId, { isFined: true }, { session });
            borrowing.status = BORROWING_STATUS.OVERDUE;
        } else {
            borrowing.status = BORROWING_STATUS.RETURNED;
        }

        const now = new Date();
        borrowing.actualReturnDate = now;
        borrowing.returnHandledLibraryId = undefined;
        borrowing.transitCompletedAt = undefined;
        await borrowing.save({ session });

        await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId), session);

        await session.commitTransaction();

        try {
            await reservationService.autoFulfillPendingReservation(toId(borrowing.bookId));
        } catch (reservationErr) {
            // Log the error but don't fail the return operation
            logger.error('[returnBook] Failed to auto-fulfill pending reservation', reservationErr);
        }

        let message = 'Bạn đã trả sách thành công.';
        if (borrowing.isFined && borrowing.fineAmount > 0) {
            message += ` Tiền phạt: ${borrowing.fineAmount.toLocaleString('vi-VN')} VND. Vui lòng thanh toán tại thư viện.`;
        }
        await notificationService.create({
            userId: toId(borrowing.userId),
            title: 'Trả sách thành công',
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

/**
 * Receive a cross-library return at non-home library.
 * Book enters transit and stock stays unchanged until home library confirms.
 */
export const receiveCrossLibraryReturn = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) === toId(requestingUser.libraryId)) {
                throw new AppError('Use returnBook for same-library return', 400, 'INVALID_RETURN_FLOW');
            }
        }

        if (borrowing.status !== BORROWING_STATUS.BORROWED && borrowing.status !== BORROWING_STATUS.OVERDUE) {
            throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
        }

        const overdueDays = calculateOverdueDays(borrowing.dueDate);
        if (overdueDays > 0) {
            borrowing.fineAmount = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
            borrowing.isFined = true;
            await User.findByIdAndUpdate(borrowing.userId, { isFined: true }, { session });
        }

        const now = new Date();
        borrowing.status = BORROWING_STATUS.RETURN_TRANSIT;
        borrowing.actualReturnDate = now;
        borrowing.returnHandledLibraryId = requestingUser.libraryId;
        borrowing.transitCompletedAt = undefined;
        await borrowing.save({ session });

        await session.commitTransaction();

        let message = 'Bạn đã trả sách tại thư viện khác. Sách đang được chuyển về thư viện gốc.';
        if (borrowing.isFined && borrowing.fineAmount > 0) {
            message += ` Tiền phạt: ${borrowing.fineAmount.toLocaleString('vi-VN')} VND.`;
        }
        await notificationService.create({
            userId: toId(borrowing.userId),
            title: 'Đã tiếp nhận trả chéo',
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

/**
 * Confirm receipt of a cross-library return at the home library.
 * This finalizes return transit and restores available stock.
 */
export const receiveTransitReturn = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

        if (borrowing.status !== BORROWING_STATUS.RETURN_TRANSIT) {
            throw new AppError('Borrowing is not in return transit state', 400, 'INVALID_STATUS');
        }

        // Only home library (or admin) can finalize inbound transit.
        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You are not authorized to receive this transit return', 403, 'FORBIDDEN');
            }
        }

        const now = new Date();
        borrowing.transitCompletedAt = now;
        borrowing.status =
            borrowing.isFined && borrowing.fineAmount > 0 && !borrowing.finePaid
                ? BORROWING_STATUS.OVERDUE
                : BORROWING_STATUS.RETURNED;
        await borrowing.save({ session });

        await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId), session);

        await session.commitTransaction();

        try {
            await reservationService.autoFulfillPendingReservation(toId(borrowing.bookId));
        } catch (reservationErr) {
            logger.error('[receiveTransitReturn] Failed to auto-fulfill pending reservation', reservationErr);
        }

        let message = 'Sách đã được thư viện gốc nhận lại thành công.';
        if (borrowing.isFined && borrowing.fineAmount > 0) {
            message += ` Tiền phạt hiện tại: ${borrowing.fineAmount.toLocaleString('vi-VN')} VND.`;
        }
        await notificationService.create({
            userId: toId(borrowing.userId),
            title: 'Hoàn tất chuyển trả sách',
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
        title: 'Hủy yêu cầu mượn',
        message: 'Yêu cầu mượn sách của bạn đã được hủy.',
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
        title: 'Gia hạn thành công',
        message: `Yêu cầu mượn sách của bạn đã được gia hạn. Hạn trả mới: ${borrowing.dueDate.toLocaleDateString('vi-VN')}`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Mark a borrowing's fine as paid (librarian/admin only).
 * Also clears user.isFined flag if all fines are now paid.
 */
export const payFine = async (id: string, requestingUser?: IUser): Promise<IBorrowing> => {
    // Librarians must be assigned to a library
    if (requestingUser?.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    // Librarians can only manage borrowings for their own library
    if (requestingUser?.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
        const canManageAtHomeLibrary = toId(borrowing.libraryId) === toId(requestingUser.libraryId);
        const canManageAtReceivingLibrary = borrowing.returnHandledLibraryId
            && toId(borrowing.returnHandledLibraryId) === toId(requestingUser.libraryId);

        if (!canManageAtHomeLibrary && !canManageAtReceivingLibrary) {
            throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
        }
    }

    return markFineAsPaidByBorrowingId(id, {
        createPaymentRecord: true,
        paymentProvider: 'cash',
        paidByUserId: requestingUser?._id.toString(),
        paidLibraryId: requestingUser?.libraryId ? toId(requestingUser.libraryId) : undefined,
    });
};

/**
 * Mark a borrowing fine as paid by borrowing ID.
 * Shared by librarian manual action and VNPay callback.
 */
export const markFineAsPaidByBorrowingId = async (
    id: string,
    options: {
        createPaymentRecord?: boolean;
        paymentProvider?: 'vnpay' | 'cash';
        paidLibraryId?: string;
        paidByUserId?: string;
    } = {}
): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    if (!borrowing.isFined) {
        throw new AppError('This borrowing has no outstanding fine', 400, 'NO_FINE');
    }

    if (borrowing.finePaid) {
        throw new AppError('Fine has already been paid', 400, 'FINE_ALREADY_PAID');
    }

    if (options.createPaymentRecord) {
        const paidAt = new Date();
        const txnRef = `cash-${borrowing._id.toString().slice(-8)}-${paidAt.getTime()}`;
        await Payment.create({
            userId: borrowing.userId,
            borrowingId: borrowing._id,
            provider: options.paymentProvider || 'cash',
            paidLibraryId: options.paidLibraryId || borrowing.libraryId,
            status: 'success',
            amount: borrowing.fineAmount,
            txnRef,
            paidAt,
            rawResponse: {
                source: 'manual-fine-collection',
                paidByUserId: options.paidByUserId || null,
            },
        });
    }

    borrowing.finePaid = true;
    // If the book was already physically returned (actualReturnDate is set),
    // paying the overdue fine should finalize the lifecycle as RETURNED.
    if (borrowing.status === BORROWING_STATUS.OVERDUE && borrowing.actualReturnDate) {
        borrowing.status = BORROWING_STATUS.RETURNED;
    }
    await borrowing.save();

    const unpaidFines = await Borrowing.countDocuments({
        userId: borrowing.userId,
        isFined: true,
        finePaid: false,
    });

    if (unpaidFines === 0) {
        await User.findByIdAndUpdate(borrowing.userId, { isFined: false });
    }

    await notificationService.create({
        userId: toId(borrowing.userId),
        title: 'Thanh toán phạt thành công',
        message: `Tiền phạt ${borrowing.fineAmount.toLocaleString('vi-VN')} VND đã được ghi nhận.`,
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

/**
 * Report a book as lost or damaged (librarian/admin action).
 * Calculates penalty and decrements stock.
 */
export const reportLostOrDamaged = async (
    id: string,
    requestingUser: IUser,
    status: 'lost' | 'damaged',
    notes?: string
): Promise<IBorrowing> => {
    // Librarians must be assigned to a library
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

        // Check if already lost or damaged to prevent duplicate penalties
        if (borrowing.status === BORROWING_STATUS.LOST || borrowing.status === BORROWING_STATUS.DAMAGED) {
            throw new AppError(`Borrowing is already marked as ${borrowing.status}`, 400, 'ALREADY_REPORTED');
        }

        // Librarians can only manage borrowings for their own library
        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
            }
        }

        if (borrowing.status !== BORROWING_STATUS.BORROWED && borrowing.status !== BORROWING_STATUS.OVERDUE) {
            throw new AppError('Only active or overdue borrowings can be reported as lost or damaged', 400, 'INVALID_STATUS');
        }

        // Always load the source book document directly to ensure we have
        // pricing/stock fields regardless of Borrowing auto-populate projections.
        const book = await Book.findById(toId(borrowing.bookId)).session(session) as IBook | null;
        if (!book) throw new AppError('Associated book not found', 404, 'BOOK_NOT_FOUND');

        // Determine penalty multiplier
        const penaltyMultiplier = status === 'lost'
            ? BORROWING_SETTINGS.LOST_PENALTY_MULTIPLIER
            : BORROWING_SETTINGS.DAMAGED_PENALTY_MULTIPLIER;

        const bookPrice = book.price || 0;
        const penaltyFee = bookPrice * penaltyMultiplier;

        borrowing.fineAmount += penaltyFee;
        borrowing.isFined = true;
        // A new penalty means there is an outstanding balance again.
        borrowing.finePaid = false;
        borrowing.status = status === 'lost' ? BORROWING_STATUS.LOST : BORROWING_STATUS.DAMAGED;
        if (notes) {
            borrowing.notes = borrowing.notes ? `${borrowing.notes}\n[${status.toUpperCase()}]: ${notes}` : `[${status.toUpperCase()}]: ${notes}`;
        }

        const now = new Date();
        borrowing.actualReturnDate = now;

        await borrowing.save({ session });

        // Update user fine status
        await User.findByIdAndUpdate(borrowing.userId, { isFined: true }, { session });

        // Decrement total copies since the book is lost or damaged beyond repair.
        // It was already decremented from availableCopies when borrowed.
        if (book.totalCopies > 0) {
            await Book.findByIdAndUpdate(
                book._id,
                { $inc: { totalCopies: -1 } },
                { session }
            );
        }

        await session.commitTransaction();

        const penaltyReason = status === 'lost' ? 'làm mất sách' : 'làm hỏng sách';
        const message = `Sách "${book.title}" đã được báo cáo là ${penaltyReason}. Bạn bị phạt ${penaltyFee.toLocaleString('vi-VN')} VND. Vui lòng thanh toán tại thư viện.`;

        await notificationService.create({
            userId: toId(borrowing.userId),
            title: `Báo cáo ${penaltyReason}`,
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

// --- BIẾN ĐIỀU KHIỂN CHẶN SPAM EMAIL (Dành cho Test) ---
// Thay đổi thành true để bật tính năng chặn (chỉ gửi 1 lần/ngày)
// Thay đổi thành false để tắt tính năng chặn (nhận được nhiều lần/ngày)
const ENABLE_EMAIL_SPAM_BLOCK = true;

/**
 * Send reminders for borrowings that will be due in N days.
 * Creates both in-app notification and email (if SMTP configured).
 * Returns the number of users that received reminder notifications.
 */
export const sendDueSoonReminders = async (daysBeforeDue: number = 2): Promise<number> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let remindedCount = 0;
    let skippedAlreadySent = 0;
    let skippedNoEmail = 0;

    const reminderDays = Array.from({ length: Math.max(1, daysBeforeDue) }, (_, i) => i + 1).reverse();

    for (const dayLeft of reminderDays) {
        const targetStart = new Date(todayStart);
        targetStart.setDate(targetStart.getDate() + dayLeft);

        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetEnd.getDate() + 1);

        const borrowings = await Borrowing.find({
            status: BORROWING_STATUS.BORROWED,
            dueDate: { $gte: targetStart, $lt: targetEnd },
        }) as IBorrowing[];

        logger.info(
            `[Scheduler] due-soon scan: dayLeft=${dayLeft}, window=${targetStart.toISOString()}..${targetEnd.toISOString()}, matched=${borrowings.length}`
        );

        for (const borrowing of borrowings) {
            const borrowingId = borrowing._id.toString();
            const userId = toId(borrowing.userId);

            let existingReminder = null;
            if (ENABLE_EMAIL_SPAM_BLOCK && !config.SCHEDULER.dueSoonAllowRepeatInSameDay) {
                existingReminder = await Notification.findOne({
                    userId,
                    type: NOTIFICATION_TYPE.OVERDUE,
                    'metadata.kind': 'due_soon_reminder',
                    'metadata.borrowingId': borrowingId,
                    'metadata.daysBeforeDue': dayLeft,
                    createdAt: { $gte: todayStart },
                }).select('_id');
            }

            if (existingReminder) {
                skippedAlreadySent += 1;
                continue;
            }

            const userRef = borrowing.userId as unknown as { fullName?: string; email?: string };
            const bookRef = borrowing.bookId as unknown as { title?: string };

            const userEmail = typeof userRef.email === 'string' ? userRef.email : '';
            const userName = typeof userRef.fullName === 'string' ? userRef.fullName : 'Bạn đọc';
            const bookTitle = typeof bookRef.title === 'string' ? bookRef.title : 'đầu sách của bạn';
            const dueDateText = borrowing.dueDate.toLocaleDateString('vi-VN');

            await notificationService.create({
                userId,
                title: 'Nhắc hạn trả sách',
                message: `Sách "${bookTitle}" sẽ đến hạn sau ${dayLeft} ngày (hạn trả: ${dueDateText}).`,
                type: NOTIFICATION_TYPE.OVERDUE,
                metadata: {
                    kind: 'due_soon_reminder',
                    borrowingId,
                    daysBeforeDue: dayLeft,
                },
            });

            if (userEmail) {
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: `[BorrowingBooks] Nhắc hạn trả sách còn ${dayLeft} ngày`,
                        text: `Xin chào ${userName},\n\nSách "${bookTitle}" của bạn sẽ đến hạn sau ${dayLeft} ngày (hạn trả: ${dueDateText}).\nVui lòng trả hoặc gia hạn đúng hạn để tránh phí phạt.\n\nTruy cập hệ thống BorrowingBooks để xem chi tiết.`,
                        html: `
<!doctype html>
<html lang="vi">
    <head>
        <meta charset="UTF-8" />
    </head>
    <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#10223d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f3f6fb;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe7f3;">
                        <tr>
                            <td style="padding:18px 22px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;">
                                <div style="font-size:18px;font-weight:700;letter-spacing:.2px;">BorrowingBooks</div>
                                <div style="margin-top:4px;font-size:13px;opacity:.95;">Nhắc hạn trả sách tự động</div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:22px;">
                                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">Xin chào <strong>${userName}</strong>,</p>
                                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">
                                    Sách <strong>${bookTitle}</strong> của bạn sẽ đến hạn sau
                                    <strong style="color:#b45309;">${dayLeft} ngày</strong>.
                                </p>

                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                    <tr>
                                        <td style="padding:12px 14px;font-size:14px;line-height:1.6;">
                                            <div><strong>Hạn trả:</strong> ${dueDateText}</div>
                                            <div><strong>Tình trạng:</strong> Đang mượn</div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#334155;">
                                    Vui lòng trả sách hoặc gia hạn đúng hạn để tránh phí phạt.
                                </p>

                                <div style="margin:0 0 8px 0;">
                                    <a href="http://localhost:3000/dashboard/borrowings" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:10px 16px;border-radius:8px;">
                                        Xem lịch sử mượn
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                                Đây là email tự động, vui lòng không trả lời email này.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`,
                    });
                } catch (err) {
                    logger.warn(`[Scheduler] Failed to send due reminder email for borrowing ${borrowingId}: ${(err as Error).message}`);
                }
            } else {
                skippedNoEmail += 1;
                logger.warn(`[Scheduler] Skip email reminder: user has no email (borrowingId=${borrowingId})`);
            }

            remindedCount += 1;
        }
    }

    logger.info(
        `[Scheduler] due-soon result: windowDays=${daysBeforeDue}, reminded=${remindedCount}, skippedAlreadySent=${skippedAlreadySent}, skippedNoEmail=${skippedNoEmail}, allowRepeatInSameDay=${config.SCHEDULER.dueSoonAllowRepeatInSameDay}`
    );

    return remindedCount;
};

/**
 * Send daily overdue-fine reminder emails.
 * Targets borrowings with status=OVERDUE and unpaid fines.
 * Sends at most 1 notification + email per borrowing per day (spam guard).
 * Returns the number of reminders sent.
 */
export const sendOverdueFineReminders = async (): Promise<number> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let remindedCount = 0;
    let skippedAlreadySent = 0;
    let skippedNoEmail = 0;

    const overdueBorrowings = await Borrowing.find({
        status: BORROWING_STATUS.OVERDUE,
        finePaid: false,
    })
        .populate('userId', 'fullName email')
        .populate('bookId', 'title') as IBorrowing[];

    logger.info(`[Scheduler] overdue-fine scan: found=${overdueBorrowings.length} unpaid-overdue borrowings`);

    for (const borrowing of overdueBorrowings) {
        const borrowingId = borrowing._id.toString();
        const userId = toId(borrowing.userId);

        // Spam guard: chỉ gửi 1 lần/ngày cho mỗi borrowing
        let alreadySentToday = null;
        if (ENABLE_EMAIL_SPAM_BLOCK) {
            alreadySentToday = await Notification.findOne({
                userId,
                type: NOTIFICATION_TYPE.OVERDUE,
                'metadata.kind': 'overdue_fine_reminder',
                'metadata.borrowingId': borrowingId,
                createdAt: { $gte: todayStart },
            }).select('_id');
        }

        if (alreadySentToday) {
            skippedAlreadySent += 1;
            continue;
        }

        const userRef = borrowing.userId as unknown as { fullName?: string; email?: string };
        const bookRef = borrowing.bookId as unknown as { title?: string };

        const userEmail = typeof userRef.email === 'string' ? userRef.email : '';
        const userName = typeof userRef.fullName === 'string' ? userRef.fullName : 'Bạn đọc';
        const bookTitle = typeof bookRef.title === 'string' ? bookRef.title : 'đầu sách của bạn';
        const dueDateText = borrowing.dueDate.toLocaleDateString('vi-VN');
        const overdueDays = calculateOverdueDays(borrowing.dueDate);
        const calculatedFine = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
        // Some old overdue records may still store fineAmount=0; always use at least the calculated daily fine.
        const fineAmount = Math.max(borrowing.fineAmount || 0, calculatedFine);

        if ((borrowing.fineAmount || 0) < fineAmount) {
            borrowing.isFined = true;
            borrowing.fineAmount = fineAmount;
            await borrowing.save();
        }

        await notificationService.create({
            userId,
            title: 'Thông báo sách quá hạn – Tiền phạt chưa thanh toán',
            message: `Sách "${bookTitle}" đã quá hạn ${overdueDays} ngày. Tiền phạt: ${fineAmount.toLocaleString('vi-VN')} VND.`,
            type: NOTIFICATION_TYPE.OVERDUE,
            metadata: {
                kind: 'overdue_fine_reminder',
                borrowingId,
                overdueDays,
                fineAmount,
            },
        });

        if (userEmail) {
            try {
                await sendEmail({
                    to: userEmail,
                    subject: `[BorrowingBooks] Sách quá hạn ${overdueDays} ngày – Vui lòng thanh toán phạt`,
                    text: `Xin chào ${userName},\n\nSách "${bookTitle}" của bạn đã quá hạn ${overdueDays} ngày (hạn trả: ${dueDateText}).\nTiền phạt hiện tại: ${fineAmount.toLocaleString('vi-VN')} VND.\n\nVui lòng đến thư viện để trả sách và thanh toán phạt sớm nhất có thể.\n\nTrân trọng,\nBorrowingBooks`,
                    html: `
<!doctype html>
<html lang="vi">
    <head>
        <meta charset="UTF-8" />
    </head>
    <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#10223d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f3f6fb;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe7f3;">
                        <tr>
                            <td style="padding:18px 22px;background:linear-gradient(135deg,#b91c1c,#dc2626);color:#ffffff;">
                                <div style="font-size:18px;font-weight:700;letter-spacing:.2px;">BorrowingBooks</div>
                                <div style="margin-top:4px;font-size:13px;opacity:.95;">Thông báo sách quá hạn &amp; tiền phạt</div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:22px;">
                                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">Xin chào <strong>${userName}</strong>,</p>
                                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">
                                    Sách <strong>${bookTitle}</strong> của bạn đã
                                    <strong style="color:#b91c1c;">quá hạn ${overdueDays} ngày</strong>.
                                </p>

                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
                                    <tr>
                                        <td style="padding:12px 14px;font-size:14px;line-height:1.7;">
                                            <div><strong>Hạn trả ban đầu:</strong> ${dueDateText}</div>
                                            <div><strong>Số ngày quá hạn:</strong> <span style="color:#b91c1c;font-weight:700;">${overdueDays} ngày</span></div>
                                            <div><strong>Tiền phạt:</strong> <span style="color:#b91c1c;font-weight:700;">${fineAmount.toLocaleString('vi-VN')} VND</span></div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#334155;">
                                    Vui lòng đến thư viện để trả sách và thanh toán tiền phạt sớm nhất có thể để tránh phát sinh thêm.
                                </p>

                                <div style="margin:0 0 8px 0;">
                                    <a href="http://localhost:3000/dashboard/borrowings" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:10px 16px;border-radius:8px;">
                                        Xem chi tiết &amp; thanh toán
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                                Đây là email tự động, vui lòng không trả lời email này.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`,
                });
            } catch (err) {
                logger.warn(`[Scheduler] Failed to send overdue-fine email for borrowing ${borrowingId}: ${(err as Error).message}`);
            }
        } else {
            skippedNoEmail += 1;
            logger.warn(`[Scheduler] Skip overdue-fine email: user has no email (borrowingId=${borrowingId})`);
        }

        remindedCount += 1;
    }

    logger.info(
        `[Scheduler] overdue-fine result: reminded=${remindedCount}, skippedAlreadySent=${skippedAlreadySent}, skippedNoEmail=${skippedNoEmail}`
    );

    return remindedCount;
};
