import mongoose, { Types } from 'mongoose';
import { Borrowing, Book, User } from '../models';
import * as notificationService from './notificationService';
import * as bookService from './bookService';
import * as reservationService from './reservationService';
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
 * For librarians: automatically filtered to their library only
 */
export const getBorrowings = async (params: GetBorrowingsQuery, requestingUser: IUser): Promise<GetBorrowingsResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, libraryId, userId } = params;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    // [UPDATED] For librarians, enforce their own library filter
    if (requestingUser.role === ROLES.LIBRARIAN) {
        if (!requestingUser.libraryId) {
            throw new AppError('Librarian must have a library assigned', 400, 'NO_LIBRARY_ASSIGNED');
        }
        query.libraryId = requestingUser.libraryId.toString();
    } else if (libraryId) {
        // Admins can filter by any libraryId
        query.libraryId = libraryId;
    }

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
 * Get borrowing by ID — enforces ownership: owner | librarian (own library) | admin only.
 */
export const getBorrowingById = async (id: string, requestingUser: IUser): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;

    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    const isOwner = toId(borrowing.userId) === requestingUser._id.toString();
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isLibrarian = requestingUser.role === ROLES.LIBRARIAN;

    // [UPDATED] For librarians, also check library match
    if (isLibrarian) {
        if (!requestingUser.libraryId) {
            throw new AppError('Librarian must have a library assigned', 400, 'NO_LIBRARY_ASSIGNED');
        }
        if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
            throw new AppError('You cannot access borrowings from other libraries', 403, 'FORBIDDEN');
        }
    }

    if (!isOwner && !isAdmin && !isLibrarian) {
        throw new AppError('You are not authorized to view this borrowing', 403, 'FORBIDDEN');
    }

    return borrowing;
};

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create borrowing request — validates libraryId belongs to the book.
 * Decrements availableCopies immediately when creating pending borrowing.
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

    // [NEW] Decrement availableCopies when creating pending borrowing
    await bookService.decrementAvailabilityAtomic(bookId);

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
 * Changes status from PENDING to BORROWED.
 * NOTE: availableCopies was already decremented when borrowing was created, so NO further decrement here.
 * For librarians: only their own library's borrowings can be confirmed.
 */
export const confirmPickup = async (id: string, requestingUser?: IUser): Promise<IBorrowing> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
        
        // [UPDATED] For librarians, check library access
        if (requestingUser && requestingUser.role === ROLES.LIBRARIAN) {
            if (!requestingUser.libraryId) {
                throw new AppError('Librarian must have a library assigned', 400, 'NO_LIBRARY_ASSIGNED');
            }
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You can only confirm pickups for your own library', 403, 'FORBIDDEN');
            }
        }
        
        if (borrowing.status !== BORROWING_STATUS.PENDING) {
            throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
        }

        // [UPDATED] No need to decrement here since it was already done in createBorrowing
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
 * For librarians: only their own library's borrowings can be returned.
 */
export const returnBook = async (id: string, requestingUser?: IUser): Promise<IBorrowing> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowing = await Borrowing.findById(id).session(session) as IBorrowing | null;
        if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
        
        // [UPDATED] For librarians, check library access
        if (requestingUser && requestingUser.role === ROLES.LIBRARIAN) {
            if (!requestingUser.libraryId) {
                throw new AppError('Librarian must have a library assigned', 400, 'NO_LIBRARY_ASSIGNED');
            }
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You can only process returns for your own library', 403, 'FORBIDDEN');
            }
        }
        
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

        // [NEW] Auto-fulfill pending reservations when book becomes available
        // This will create a borrowing for the earliest pending reservation and mark it as completed
        try {
            const bookId = toId(borrowing.bookId);
            await reservationService.autoFulfillNextReservation(bookId);
        } catch (error) {
            // Log error but don't fail the return process
            console.error('[ERROR] Failed to auto-fulfill reservation after book return:', error);
        }

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
 * Increments availableCopies back when cancelling.
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

    // [NEW] Increment availableCopies back when cancelling
    await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId));

    borrowing.status = BORROWING_STATUS.CANCELLED;
    await borrowing.save();

    await notificationService.create({
        userId,
        title: 'Borrowing Cancelled',
        message: 'Your borrowing request has been cancelled.',
        type: NOTIFICATION_TYPE.BORROWING,
    });

    // [NEW] Auto-fulfill pending reservations when book becomes available after cancellation
    try {
        const bookId = toId(borrowing.bookId);
        await reservationService.autoFulfillNextReservation(bookId);
    } catch (error) {
        // Log error but don't fail the cancellation process
        console.error('[ERROR] Failed to auto-fulfill reservation after borrowing cancellation:', error);
    }

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
 * For librarians: only their own library's fines can be marked as paid.
 */
export const payFine = async (id: string, requestingUser?: IUser): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    // [UPDATED] For librarians, check library access
    if (requestingUser && requestingUser.role === ROLES.LIBRARIAN) {
        if (!requestingUser.libraryId) {
            throw new AppError('Librarian must have a library assigned', 400, 'NO_LIBRARY_ASSIGNED');
        }
        if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
            throw new AppError('You can only manage fines for your own library', 403, 'FORBIDDEN');
        }
    }

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

/**
 * Auto-cancel pending borrowings that are older than 24 hours.
 * Also increments availableCopies back for each cancelled borrowing.
 * Called by scheduler.
 * 
 * FIX: Use getTime() for UTC-consistent comparison to avoid timezone mismatch
 */
export const autoCancelExpiredPending = async (): Promise<number> => {
    // Calculate 24 hours ago in milliseconds (UTC-consistent)
    const nowMs = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const twentyFourHoursAgoMs = nowMs - twentyFourHoursMs;

    console.log('[DEBUG] Checking for expired pending borrowings');
    console.log('[DEBUG] Current time (UTC):', new Date(nowMs).toISOString());
    console.log('[DEBUG] 24h ago (UTC):', new Date(twentyFourHoursAgoMs).toISOString());

    // Find expired pending borrowings using milliseconds for accurate UTC comparison
    const expiredBorrowings = await Borrowing.find({
        status: BORROWING_STATUS.PENDING,
        createdAt: { $lt: new Date(twentyFourHoursAgoMs) },
    }) as IBorrowing[];

    console.log(`[DEBUG] Found ${expiredBorrowings.length} expired pending borrowing(s)`);
    expiredBorrowings.forEach((b) => {
        const ageMs = nowMs - b.createdAt.getTime();
        const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(2);
        console.log(`[DEBUG] Borrowing ${b._id}: createdAt=${b.createdAt.toISOString()}, age=${ageHours}h, status=${b.status}`);
    });

    let cancelledCount = 0;

    for (const borrowing of expiredBorrowings) {
        try {
            console.log(`[DEBUG] Auto-cancelling borrowing ${borrowing._id}...`);
            // Increment availableCopies back
            await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId));

            // Update borrowing status to cancelled
            borrowing.status = BORROWING_STATUS.CANCELLED;
            await borrowing.save();

            console.log(`[DEBUG] Successfully cancelled borrowing ${borrowing._id}`);

            // Send notification
            await notificationService.create({
                userId: toId(borrowing.userId),
                title: 'Borrowing Request Expired',
                message: 'Your borrowing request has been automatically cancelled as it was not picked up within 24 hours.',
                type: NOTIFICATION_TYPE.BORROWING,
            });

            cancelledCount++;
        } catch (error) {
            // Log error but continue processing other borrowings
            console.error(`[ERROR] Failed to auto-cancel borrowing ${borrowing._id}:`, error);
        }
    }

    console.log(`[DEBUG] Auto-cancel completed. Total cancelled: ${cancelledCount}`);
    return cancelledCount;
};
