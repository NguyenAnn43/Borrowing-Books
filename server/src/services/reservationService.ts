import { Types } from 'mongoose';
import { Reservation, Book, Borrowing } from '../models';
import * as notificationService from './notificationService';
import {
    AppError, formatPagination, generateDueDate,
    RESERVATION_STATUS, RESERVATION_SETTINGS, BORROWING_STATUS,
    BORROWING_SETTINGS, NOTIFICATION_TYPE, PAGINATION,
} from '../utils';
import { IReservation, IBook, IUser, IBorrowing, PaginationMeta } from '../types';
import { CreateReservationInput, GetReservationsQuery } from '../validators/reservationSchema';

interface GetReservationsResult {
    reservations: IReservation[];
    pagination: PaginationMeta;
}

const toId = (field: unknown): string => {
    if (field instanceof Types.ObjectId) return field.toString();
    if (field && typeof field === 'object' && '_id' in (field as object)) {
        return (field as { _id: Types.ObjectId })._id.toString();
    }
    return String(field);
};

/**
 * Get all reservations — librarian/admin
 */
export const getReservations = async (params: GetReservationsQuery): Promise<GetReservationsResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, libraryId, userId } = params;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (libraryId) query.libraryId = libraryId;
    if (userId) query.userId = userId;

    const skip = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const [reservations, total] = await Promise.all([
        Reservation.find(query).skip(skip).limit(actualLimit).sort({ createdAt: -1 }) as Promise<IReservation[]>,
        Reservation.countDocuments(query),
    ]);

    return { reservations, pagination: formatPagination(page, actualLimit, total) };
};

/**
 * Get user's own reservations
 */
export const getMyReservations = async (
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {}
): Promise<GetReservationsResult> => {
    const { page = 1, limit = 10, status } = params;
    const query: Record<string, unknown> = { userId };
    if (status) query.status = status;

    const [reservations, total] = await Promise.all([
        Reservation.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }) as Promise<IReservation[]>,
        Reservation.countDocuments(query),
    ]);

    return { reservations, pagination: formatPagination(page, limit, total) };
};

/**
 * Get reservation by ID — owner | librarian | admin
 */
export const getReservationById = async (id: string, requestingUser: IUser): Promise<IReservation> => {
    const reservation = await Reservation.findById(id) as IReservation | null;
    if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

    const isOwner = toId(reservation.userId) === requestingUser._id.toString();
    const isStaff = requestingUser.role === 'librarian' || requestingUser.role === 'admin';

    if (!isOwner && !isStaff) {
        throw new AppError('You are not authorized to view this reservation', 403, 'FORBIDDEN');
    }

    return reservation;
};

/**
 * Create a reservation (user action).
 * expiryDate is NOT set here — only set when transitioned to READY.
 */
export const createReservation = async (userId: string, data: CreateReservationInput): Promise<IReservation> => {
    const { bookId, libraryId } = data;

    const book = await Book.findById(bookId) as IBook | null;
    if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

    if (book.libraryId.toString() !== libraryId) {
        throw new AppError('The provided libraryId does not match the book\'s library', 400, 'LIBRARY_MISMATCH');
    }

    // Prevent duplicate active reservations
    const existing = await Reservation.findOne({
        userId,
        bookId,
        status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    });
    if (existing) {
        throw new AppError('You already have an active reservation for this book', 400, 'ALREADY_RESERVED');
    }

    const reservation = await Reservation.create({
        userId,
        bookId,
        libraryId,
        status: RESERVATION_STATUS.PENDING,
        // expiryDate intentionally omitted — set when READY
    }) as IReservation;

    await notificationService.create({
        userId,
        title: 'Reservation Created',
        message: `Your reservation for "${book.title}" has been submitted. We will notify you when it is ready.`,
        type: NOTIFICATION_TYPE.RESERVATION,
    });

    return reservation;
};

/**
 * Mark reservation as READY (librarian action).
 * Sets expiryDate = now + RESERVATION_SETTINGS.EXPIRY_DAYS.
 */
export const markReady = async (id: string): Promise<IReservation> => {
    const reservation = await Reservation.findById(id) as IReservation | null;
    if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

    if (reservation.status !== RESERVATION_STATUS.PENDING) {
        throw new AppError('Only pending reservations can be marked as ready', 400, 'INVALID_STATUS');
    }

    reservation.status = RESERVATION_STATUS.READY;
    reservation.expiryDate = generateDueDate(new Date(), RESERVATION_SETTINGS.EXPIRY_DAYS);
    await reservation.save();

    await notificationService.create({
        userId: toId(reservation.userId),
        title: 'Book Ready for Pickup',
        message: `Your reserved book is ready for pickup. Please collect it before ${reservation.expiryDate!.toLocaleDateString('vi-VN')}.`,
        type: NOTIFICATION_TYPE.RESERVATION,
    });

    return reservation;
};

/**
 * Cancel a reservation (owner, when PENDING or READY).
 */
export const cancelReservation = async (id: string, userId: string): Promise<IReservation> => {
    const reservation = await Reservation.findById(id) as IReservation | null;
    if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

    if (toId(reservation.userId) !== userId) {
        throw new AppError('You are not authorized to cancel this reservation', 403, 'FORBIDDEN');
    }

    if (![RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY].includes(reservation.status as 'pending' | 'ready')) {
        throw new AppError('Only pending or ready reservations can be cancelled', 400, 'INVALID_STATUS');
    }

    reservation.status = RESERVATION_STATUS.CANCELLED;
    await reservation.save();

    await notificationService.create({
        userId,
        title: 'Reservation Cancelled',
        message: 'Your reservation has been cancelled.',
        type: NOTIFICATION_TYPE.RESERVATION,
    });

    return reservation;
};

/**
 * Fulfill a reservation (librarian): READY → COMPLETED.
 * Creates a Borrowing record and links it back via borrowingId.
 */
export const fulfillReservation = async (id: string): Promise<IReservation> => {
    const reservation = await Reservation.findById(id) as IReservation | null;
    if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

    if (reservation.status !== RESERVATION_STATUS.READY) {
        throw new AppError('Only ready reservations can be fulfilled', 400, 'INVALID_STATUS');
    }

    // Create a Borrowing from this reservation
    const dueDate = generateDueDate(new Date(), BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);
    const borrowing = await Borrowing.create({
        userId: reservation.userId,
        bookId: reservation.bookId,
        libraryId: reservation.libraryId,
        dueDate,
        status: BORROWING_STATUS.BORROWED,
        borrowDate: new Date(),
    }) as IBorrowing;

    // Link borrowingId for end-to-end traceability
    reservation.status = RESERVATION_STATUS.COMPLETED;
    reservation.borrowingId = borrowing._id;
    await reservation.save();

    await notificationService.create({
        userId: toId(reservation.userId),
        title: 'Reservation Fulfilled',
        message: `Your reservation has been fulfilled. Due date: ${dueDate.toLocaleDateString('vi-VN')}`,
        type: NOTIFICATION_TYPE.RESERVATION,
    });

    return reservation;
};

/**
 * Bulk-expire READY reservations past their expiryDate (scheduler job).
 */
export const expireReservations = async (): Promise<number> => {
    const result = await Reservation.updateMany(
        { status: RESERVATION_STATUS.READY, expiryDate: { $lt: new Date() } },
        { status: RESERVATION_STATUS.EXPIRED }
    );
    return result.modifiedCount;
};
