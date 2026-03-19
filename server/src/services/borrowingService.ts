import mongoose, { Types } from 'mongoose';
import { Borrowing, Book, User } from '../models';
import * as notificationService from './notificationService';
import * as bookService from './bookService';
import * as reservationService from './reservationService';
import logger from '../utils/logger';
import {
    AppError, formatPagination, generateDueDate, calculateOverdueDays, calculateFine,
    BORROWING_STATUS, BORROWING_SETTINGS, PAGINATION, NOTIFICATION_TYPE,
} from '../utils';
import { IBorrowing, IBook, IUser, PaginationMeta } from '../types';
import { GetBorrowingsQuery, CreateBorrowingInput, CreateBulkBorrowingInput } from '../validators/borrowingSchema';
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
 * Librarians can only see borrowings for their own library
 */
export const getBorrowings = async (params: GetBorrowingsQuery, requestingUser: IUser): Promise<GetBorrowingsResult> => {
    // Librarians must be assigned to a library
    if (requestingUser.role === ROLES.LIBRARIAN && !requestingUser.libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }

    const { q, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, libraryId, userId } = params;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    // Librarians can only view borrowings for their own library
    if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
        query.libraryId = requestingUser.libraryId;
    } else if (libraryId && requestingUser.role === ROLES.ADMIN) {
        // Only admins can filter by different libraries
        query.libraryId = libraryId;
    }

    // Add search by book title or user name
    if (q) {
        const searchQuery = { $regex: q, $options: 'i' };
        // Search in related collections
        const matchingBooks = await Book.find({ title: searchQuery }).select('_id');
        const bookIds = matchingBooks.map((b) => b._id);
        if (bookIds.length > 0) {
            query.bookId = { $in: bookIds };
        } else {
            // Also try text search in users
            const matchingUsers = await User.find({ $text: { $search: q } }).select('_id');
            if (matchingUsers.length > 0) {
                query.userId = { $in: matchingUsers.map((u) => u._id) };
            } else {
                // If no matches, return empty result
                return { borrowings: [], pagination: formatPagination(page, limit, 0) };
            }
        }
    }

    const skip = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query)
            .skip(skip)
            .limit(actualLimit)
            .sort({ createdAt: -1 })
            .populate('bookId', 'title author')
            .populate('userId', 'name email')
            .populate('libraryId', 'name') as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return { borrowings, pagination: formatPagination(page, actualLimit, total) };
};

/**
 * Get user's own borrowings with optional search
 */
export const getMyBorrowings = async (
    userId: string,
    params: { page?: number; limit?: number; status?: string; q?: string } = {}
): Promise<GetBorrowingsResult> => {
    const { q, page = 1, limit = 10, status } = params;
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;

    // Add search by book title
    if (q) {
        const searchQuery = { $regex: q, $options: 'i' };
        const matchingBooks = await Book.find({ title: searchQuery }).select('_id');
        const bookIds = matchingBooks.map((b) => b._id);
        if (bookIds.length > 0) {
            query.bookId = { $in: bookIds };
        } else {
            // If no matches, return empty result
            return { borrowings: [], pagination: formatPagination(page, limit, 0) };
        }
    }

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate('bookId', 'title author')
            .populate('userId', 'name email')
            .populate('libraryId', 'name') as Promise<IBorrowing[]>,
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

        // Librarians can only manage borrowings for their own library
        if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
            if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
                throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
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
            // Keep status as OVERDUE if book is returned late
            borrowing.status = BORROWING_STATUS.OVERDUE;
        } else {
            // Set status to RETURNED if book is returned on time
            borrowing.status = BORROWING_STATUS.RETURNED;
        }

        const now = new Date();
        borrowing.actualReturnDate = now;
        // returnDate is mirrored automatically in pre-save hook
        await borrowing.save({ session });

        // [P0] Atomic increment — same transaction
        await bookService.incrementAvailabilityAtomic(toId(borrowing.bookId), session);

        await session.commitTransaction();

        // Check for pending reservations and auto-fulfill the earliest one
        try {
            await reservationService.autoFulfillPendingReservation(toId(borrowing.bookId));
        } catch (reservationErr) {
            // Log the error but don't fail the return operation
            logger.error('[returnBook] Failed to auto-fulfill pending reservation', reservationErr);
        }

        // Notification outside transaction
        let message = 'Bạn đã trả sách thành công.';
        if (borrowing.isFined) {
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
        if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
            throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
        }
    }

    return markFineAsPaidByBorrowingId(id);
};

/**
 * Mark a borrowing fine as paid by borrowing ID.
 * Shared by librarian manual action and VNPay callback.
 */
export const markFineAsPaidByBorrowingId = async (id: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;
    if (!borrowing) throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');

    // Librarians can only manage borrowings for their own library
    if (requestingUser.role === ROLES.LIBRARIAN && requestingUser.libraryId) {
        if (toId(borrowing.libraryId) !== toId(requestingUser.libraryId)) {
            throw new AppError('You are not authorized to manage this borrowing', 403, 'FORBIDDEN');
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
