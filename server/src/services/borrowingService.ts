import { Types } from 'mongoose';
import { Borrowing, Book, User } from '../models';
import * as notificationService from './notificationService';
import * as bookService from './bookService';
import { AppError, formatPagination, generateDueDate, calculateOverdueDays, calculateFine, BORROWING_STATUS, BORROWING_SETTINGS, PAGINATION, NOTIFICATION_TYPE } from '../utils';
import { IBorrowing, IBook, IUser, PaginationMeta } from '../types';
import { GetBorrowingsQuery, CreateBorrowingInput } from '../validators/borrowingSchema';

interface GetBorrowingsResult {
    borrowings: IBorrowing[];
    pagination: PaginationMeta;
}

/**
 * Get all borrowings with pagination and filters
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
        Borrowing.find(query)
            .skip(skip)
            .limit(actualLimit)
            .sort({ createdAt: -1 }) as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return {
        borrowings,
        pagination: formatPagination(page, actualLimit, total),
    };
};

/**
 * Get user's borrowings
 */
export const getMyBorrowings = async (
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {}
): Promise<GetBorrowingsResult> => {
    const { page = 1, limit = 10, status } = params;

    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [borrowings, total] = await Promise.all([
        Borrowing.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }) as Promise<IBorrowing[]>,
        Borrowing.countDocuments(query),
    ]);

    return {
        borrowings,
        pagination: formatPagination(page, limit, total),
    };
};

/**
 * Get borrowing by ID
 */
export const getBorrowingById = async (id: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;

    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    return borrowing;
};

/**
 * Create borrowing request
 */
export const createBorrowing = async (userId: string, data: CreateBorrowingInput): Promise<IBorrowing> => {
    const { bookId, libraryId, notes } = data;

    // Check if book exists and is available
    const book = await Book.findById(bookId) as IBook | null;
    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    if (book.availableCopies <= 0) {
        throw new AppError('Book is not available', 400, 'BOOK_UNAVAILABLE');
    }

    // Check user's borrow limit
    const user = await User.findById(userId) as IUser | null;
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
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

    // Check if user already has this book
    const existingBorrowing = await Borrowing.findOne({
        userId,
        bookId,
        status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
    });

    if (existingBorrowing) {
        throw new AppError('You already have this book borrowed', 400, 'ALREADY_BORROWED');
    }

    // Create borrowing
    const dueDate = generateDueDate(new Date(), BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);

    const borrowing = await Borrowing.create({
        userId,
        bookId,
        libraryId,
        dueDate,
        notes,
        status: BORROWING_STATUS.PENDING,
    }) as IBorrowing;

    // Send notification
    await notificationService.create({
        userId,
        title: 'Borrowing Request Created',
        message: `Your request to borrow "${book.title}" has been submitted.`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Confirm book pickup (librarian action)
 */
export const confirmPickup = async (id: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;

    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    if (borrowing.status !== BORROWING_STATUS.PENDING) {
        throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
    }

    // Update borrowing status
    borrowing.status = BORROWING_STATUS.BORROWED;
    borrowing.borrowDate = new Date();
    borrowing.dueDate = generateDueDate(new Date(), BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);
    await borrowing.save();

    // Decrease book availability
    const bookIdStr = borrowing.bookId instanceof Types.ObjectId
        ? borrowing.bookId.toString()
        : (borrowing.bookId as unknown as { _id: Types.ObjectId })._id.toString();
    await bookService.updateAvailability(bookIdStr, -1);

    // Get user ID for notification
    const userIdStr = borrowing.userId instanceof Types.ObjectId
        ? borrowing.userId.toString()
        : (borrowing.userId as unknown as { _id: Types.ObjectId })._id.toString();

    // Send notification
    await notificationService.create({
        userId: userIdStr,
        title: 'Book Picked Up',
        message: `You have picked up the book. Due date: ${borrowing.dueDate.toLocaleDateString()}`,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};

/**
 * Return book (librarian action)
 */
export const returnBook = async (id: string): Promise<IBorrowing> => {
    const borrowing = await Borrowing.findById(id) as IBorrowing | null;

    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    if (borrowing.status !== BORROWING_STATUS.BORROWED && borrowing.status !== BORROWING_STATUS.OVERDUE) {
        throw new AppError('Invalid borrowing status', 400, 'INVALID_STATUS');
    }

    // Calculate fine if overdue
    const overdueDays = calculateOverdueDays(borrowing.dueDate);
    if (overdueDays > 0) {
        borrowing.fineAmount = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
        borrowing.isFined = true;
    }

    // Update borrowing
    borrowing.status = BORROWING_STATUS.RETURNED;
    borrowing.returnDate = new Date();
    borrowing.actualReturnDate = new Date();
    await borrowing.save();

    // Increase book availability
    const bookIdStr = borrowing.bookId instanceof Types.ObjectId
        ? borrowing.bookId.toString()
        : (borrowing.bookId as unknown as { _id: Types.ObjectId })._id.toString();
    await bookService.updateAvailability(bookIdStr, 1);

    // Get user ID for notification
    const userIdStr = borrowing.userId instanceof Types.ObjectId
        ? borrowing.userId.toString()
        : (borrowing.userId as unknown as { _id: Types.ObjectId })._id.toString();

    // Send notification
    let message = `You have returned the book.`;
    if (borrowing.isFined) {
        message += ` Fine amount: ${borrowing.fineAmount.toLocaleString()} VND`;
    }

    await notificationService.create({
        userId: userIdStr,
        title: 'Book Returned',
        message,
        type: NOTIFICATION_TYPE.BORROWING,
    });

    return borrowing;
};
