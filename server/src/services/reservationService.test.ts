import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

// ── Mock models ──────────────────────────────────────────────────────────────
const {
    mockReservationFindById,
    mockReservationFindOne,
    mockReservationFind,
    mockReservationCountDocuments,
    mockReservationCreate,
    mockReservationUpdateMany,
    mockReservationSave,
    mockBookFindById,
    mockBorrowingCreate,
} = vi.hoisted(() => ({
    mockReservationFindById: vi.fn(),
    mockReservationFindOne: vi.fn(),
    mockReservationFind: vi.fn(),
    mockReservationCountDocuments: vi.fn(),
    mockReservationCreate: vi.fn(),
    mockReservationUpdateMany: vi.fn(),
    mockReservationSave: vi.fn(),
    mockBookFindById: vi.fn(),
    mockBorrowingCreate: vi.fn(),
}));

vi.mock('../models', () => ({
    Reservation: {
        findById: mockReservationFindById,
        findOne: mockReservationFindOne,
        find: mockReservationFind,
        countDocuments: mockReservationCountDocuments,
        create: mockReservationCreate,
        updateMany: mockReservationUpdateMany,
    },
    Book: {
        findById: mockBookFindById,
    },
    Borrowing: {
        create: mockBorrowingCreate,
    },
}));

vi.mock('./notificationService', () => ({
    create: vi.fn().mockResolvedValue({}),
}));

import * as reservationService from './reservationService';
import { RESERVATION_STATUS } from '../utils/constants';
import { IUser, IReservation, IBook } from '../types';

const makeUser = (overrides = {}): Partial<IUser> => ({
    _id: new Types.ObjectId(),
    role: 'user',
    ...overrides,
});

const makeBook = (overrides = {}): Partial<IBook> => ({
    _id: new Types.ObjectId(),
    libraryId: new Types.ObjectId(),
    title: 'Test Book',
    ...overrides,
});

const makeReservation = (overrides = {}): Partial<IReservation> & { save: ReturnType<typeof vi.fn> } => ({
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    bookId: new Types.ObjectId(),
    libraryId: new Types.ObjectId(),
    status: RESERVATION_STATUS.PENDING,
    save: mockReservationSave,
    ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('reservationService.createReservation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates a PENDING reservation without expiryDate', async () => {
        const libraryId = new Types.ObjectId();
        const book = makeBook({ libraryId });
        const reservation = makeReservation({ libraryId });

        mockBookFindById.mockResolvedValue(book);
        mockReservationFindOne.mockResolvedValue(null); // no existing
        mockReservationCreate.mockResolvedValue(reservation);

        const result = await reservationService.createReservation(
            new Types.ObjectId().toString(),
            { bookId: book._id!.toString(), libraryId: libraryId.toString() }
        );

        expect(result.status).toBe(RESERVATION_STATUS.PENDING);
        // expiryDate must be null/undefined at creation time
        expect(result.expiryDate).toBeFalsy();
    });

    it('throws LIBRARY_MISMATCH when libraryId does not match book', async () => {
        const book = makeBook({ libraryId: new Types.ObjectId() });
        mockBookFindById.mockResolvedValue(book);

        await expect(
            reservationService.createReservation(
                new Types.ObjectId().toString(),
                { bookId: book._id!.toString(), libraryId: new Types.ObjectId().toString() }
            )
        ).rejects.toMatchObject({ statusCode: 400, code: 'LIBRARY_MISMATCH' });
    });

    it('throws ALREADY_RESERVED when duplicate active reservation exists', async () => {
        const libraryId = new Types.ObjectId();
        const book = makeBook({ libraryId });
        mockBookFindById.mockResolvedValue(book);
        mockReservationFindOne.mockResolvedValue(makeReservation()); // existing

        await expect(
            reservationService.createReservation(
                new Types.ObjectId().toString(),
                { bookId: book._id!.toString(), libraryId: libraryId.toString() }
            )
        ).rejects.toMatchObject({ statusCode: 400, code: 'ALREADY_RESERVED' });
    });
});

describe('reservationService.markReady', () => {
    beforeEach(() => vi.clearAllMocks());

    it('transitions PENDING → READY and sets expiryDate', async () => {
        const now = new Date();
        const reservation = makeReservation({ status: RESERVATION_STATUS.PENDING });
        mockReservationFindById.mockResolvedValue(reservation);
        mockReservationSave.mockResolvedValue(reservation);

        await reservationService.markReady(reservation._id!.toString());

        expect(reservation.status).toBe(RESERVATION_STATUS.READY);
        expect(reservation.expiryDate).toBeDefined();
        expect(new Date(reservation.expiryDate!).getTime()).toBeGreaterThan(now.getTime());
    });

    it('throws INVALID_STATUS when not PENDING', async () => {
        const reservation = makeReservation({ status: RESERVATION_STATUS.READY });
        mockReservationFindById.mockResolvedValue(reservation);

        await expect(reservationService.markReady(reservation._id!.toString()))
            .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STATUS' });
    });
});

describe('reservationService.cancelReservation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('cancels a PENDING reservation by owner', async () => {
        const userId = new Types.ObjectId();
        const reservation = makeReservation({ userId, status: RESERVATION_STATUS.PENDING });
        mockReservationFindById.mockResolvedValue(reservation);
        mockReservationSave.mockResolvedValue(reservation);

        await reservationService.cancelReservation(reservation._id!.toString(), userId.toString());
        expect(reservation.status).toBe(RESERVATION_STATUS.CANCELLED);
    });

    it('throws 403 when user is not owner', async () => {
        const reservation = makeReservation({ userId: new Types.ObjectId(), status: RESERVATION_STATUS.PENDING });
        mockReservationFindById.mockResolvedValue(reservation);

        await expect(
            reservationService.cancelReservation(reservation._id!.toString(), new Types.ObjectId().toString())
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('throws INVALID_STATUS when reservation is COMPLETED', async () => {
        const userId = new Types.ObjectId();
        const reservation = makeReservation({ userId, status: RESERVATION_STATUS.COMPLETED });
        mockReservationFindById.mockResolvedValue(reservation);

        await expect(
            reservationService.cancelReservation(reservation._id!.toString(), userId.toString())
        ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STATUS' });
    });
});

describe('reservationService.fulfillReservation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates a Borrowing and links borrowingId back to reservation', async () => {
        const reservation = makeReservation({ status: RESERVATION_STATUS.READY });
        const borrowingId = new Types.ObjectId();
        const borrowing = { _id: borrowingId };

        mockReservationFindById.mockResolvedValue(reservation);
        mockBorrowingCreate.mockResolvedValue(borrowing);
        mockReservationSave.mockResolvedValue(reservation);

        await reservationService.fulfillReservation(reservation._id!.toString());

        expect(reservation.status).toBe(RESERVATION_STATUS.COMPLETED);
        expect(reservation.borrowingId?.toString()).toBe(borrowingId.toString());
    });

    it('throws INVALID_STATUS when not READY', async () => {
        const reservation = makeReservation({ status: RESERVATION_STATUS.PENDING });
        mockReservationFindById.mockResolvedValue(reservation);

        await expect(reservationService.fulfillReservation(reservation._id!.toString()))
            .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STATUS' });
    });
});

describe('reservationService.expireReservations', () => {
    beforeEach(() => vi.clearAllMocks());

    it('bulk-updates expired READY reservations and returns count', async () => {
        mockReservationUpdateMany.mockResolvedValue({ modifiedCount: 3 });
        const count = await reservationService.expireReservations();
        expect(count).toBe(3);
        expect(mockReservationUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ status: RESERVATION_STATUS.READY }),
            expect.objectContaining({ status: RESERVATION_STATUS.EXPIRED })
        );
    });
});
