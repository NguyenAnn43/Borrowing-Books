import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

// ── Mock models before importing the service ────────────────────────────────
const {
    mockBorrowingFindById,
    mockBorrowingFind,
    mockBorrowingFindOne,
    mockBorrowingCountDocuments,
    mockBorrowingCreate,
    mockBorrowingUpdateMany,
    mockBorrowingSave,
    mockBookFind,
    mockBookFindById,
    mockUserFind,
    mockUserFindById,
    mockSession,
    mockDecrement,
    mockIncrement,
    mockBookFindByIdAndUpdate,
    mockUserFindByIdAndUpdate,
    mockPaymentCreate,
} = vi.hoisted(() => ({
    mockBorrowingFindById: vi.fn(),
    mockBorrowingFind: vi.fn(),
    mockBorrowingFindOne: vi.fn(),
    mockBorrowingCountDocuments: vi.fn(),
    mockBorrowingCreate: vi.fn(),
    mockBorrowingUpdateMany: vi.fn(),
    mockBorrowingSave: vi.fn(),
    mockBookFind: vi.fn(),
    mockBookFindById: vi.fn(),
    mockUserFind: vi.fn(),
    mockUserFindById: vi.fn(),
    mockSession: {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
    },
    mockDecrement: vi.fn(),
    mockIncrement: vi.fn(),
    mockBookFindByIdAndUpdate: vi.fn(),
    mockUserFindByIdAndUpdate: vi.fn(),
    mockPaymentCreate: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => {
    const actual = await importOriginal<typeof import('mongoose')>();
    return {
        ...actual,
        startSession: vi.fn().mockResolvedValue(mockSession),
        default: {
            ...actual,
            startSession: vi.fn().mockResolvedValue(mockSession),
        }
    };
});

vi.mock('../models', () => ({
    Borrowing: {
        findById: mockBorrowingFindById,
        find: mockBorrowingFind,
        findOne: mockBorrowingFindOne,
        countDocuments: mockBorrowingCountDocuments,
        create: mockBorrowingCreate,
        updateMany: mockBorrowingUpdateMany,
    },
    Book: {
        find: mockBookFind,
        findById: mockBookFindById,
        findByIdAndUpdate: mockBookFindByIdAndUpdate,
    },
    User: {
        find: mockUserFind,
        findById: mockUserFindById,
        findByIdAndUpdate: mockUserFindByIdAndUpdate,
    },
    Payment: {
        create: mockPaymentCreate,
    },
}));

vi.mock('./bookService', () => ({
    decrementAvailabilityAtomic: mockDecrement,
    incrementAvailabilityAtomic: mockIncrement,
}));

vi.mock('./notificationService', () => ({
    create: vi.fn().mockResolvedValue({}),
}));

vi.mock('./reservationService', () => ({
    autoFulfillPendingReservation: vi.fn().mockResolvedValue(null),
}));

// Import AFTER mocks
import * as borrowingService from './borrowingService';
import { BORROWING_STATUS } from '../utils/constants';
import { IUser, IBorrowing, IBook } from '../types';

// ── Test helpers ─────────────────────────────────────────────────────────────
const makeUser = (overrides = {}): Partial<IUser> => ({
    _id: new Types.ObjectId(),
    role: 'user',
    maxBorrowLimit: 5,
    status: 'active',
    ...overrides,
});

const makeBook = (overrides = {}): Partial<IBook> => ({
    _id: new Types.ObjectId(),
    libraryId: new Types.ObjectId(),
    availableCopies: 2,
    totalCopies: 5,
    title: 'Test Book',
    ...overrides,
});

const makeBorrowing = (overrides = {}): Partial<IBorrowing> & { save: ReturnType<typeof vi.fn> } => ({
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    bookId: new Types.ObjectId(),
    libraryId: new Types.ObjectId(),
    status: BORROWING_STATUS.PENDING,
    fineAmount: 0,
    isFined: false,
    finePaid: false,
    renewalCount: 0,
    maxRenewals: 2,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    save: mockBorrowingSave,
    ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('borrowingService.getBorrowingById', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns borrowing when requesting user is owner', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({ userId });
        mockBorrowingFindById.mockReturnValue({ session: vi.fn().mockResolvedValue(borrowing) });
        // For non-session path
        mockBorrowingFindById.mockResolvedValue(borrowing);

        const user = makeUser({ _id: userId, role: 'user' }) as IUser;
        const result = await borrowingService.getBorrowingById(borrowing._id!.toString(), user);
        expect(result).toBeDefined();
    });

    it('returns borrowing when requesting user is librarian', async () => {
        const borrowing = makeBorrowing();
        mockBorrowingFindById.mockResolvedValue(borrowing);
        const user = makeUser({ _id: new Types.ObjectId(), role: 'librarian' }) as IUser;
        const result = await borrowingService.getBorrowingById(borrowing._id!.toString(), user);
        expect(result).toBeDefined();
    });

    it('throws 403 when user is not owner and not staff', async () => {
        const borrowing = makeBorrowing({ userId: new Types.ObjectId() });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        const user = makeUser({ _id: new Types.ObjectId(), role: 'user' }) as IUser;

        await expect(borrowingService.getBorrowingById(borrowing._id!.toString(), user))
            .rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('throws 404 when borrowing not found', async () => {
        mockBorrowingFindById.mockResolvedValue(null);
        const user = makeUser() as IUser;
        await expect(borrowingService.getBorrowingById(new Types.ObjectId().toString(), user))
            .rejects.toMatchObject({ statusCode: 404, code: 'BORROWING_NOT_FOUND' });
    });
});

describe('borrowingService.createBorrowing — libraryId mismatch', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws LIBRARY_MISMATCH when libraryId does not match book.libraryId', async () => {
        const book = makeBook({ libraryId: new Types.ObjectId() });
        mockBookFindById.mockResolvedValue(book);

        const differentLibraryId = new Types.ObjectId().toString();
        const userId = new Types.ObjectId().toString();

        await expect(
            borrowingService.createBorrowing(userId, {
                bookId: book._id!.toString(),
                libraryId: differentLibraryId,
            })
        ).rejects.toMatchObject({ statusCode: 400, code: 'LIBRARY_MISMATCH' });
    });

    it('throws BOOK_UNAVAILABLE when no copies available', async () => {
        const libraryId = new Types.ObjectId();
        const book = makeBook({ libraryId, availableCopies: 0 });
        mockBookFindById.mockResolvedValue(book);

        await expect(
            borrowingService.createBorrowing(new Types.ObjectId().toString(), {
                bookId: book._id!.toString(),
                libraryId: libraryId.toString(),
            })
        ).rejects.toMatchObject({ statusCode: 400, code: 'BOOK_UNAVAILABLE' });
    });
});

describe('borrowingService.cancelBorrowing', () => {
    beforeEach(() => vi.clearAllMocks());

    it('cancels a PENDING borrowing by the owner', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({ userId, status: BORROWING_STATUS.PENDING });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        mockBorrowingSave.mockResolvedValue(borrowing);

        await borrowingService.cancelBorrowing(borrowing._id!.toString(), userId.toString());
        expect(borrowing.status).toBe(BORROWING_STATUS.CANCELLED);
        expect(mockBorrowingSave).toHaveBeenCalled();
    });

    it('throws 403 when user is not the owner', async () => {
        const borrowing = makeBorrowing({ userId: new Types.ObjectId(), status: BORROWING_STATUS.PENDING });
        mockBorrowingFindById.mockResolvedValue(borrowing);

        await expect(
            borrowingService.cancelBorrowing(borrowing._id!.toString(), new Types.ObjectId().toString())
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('throws INVALID_STATUS when borrowing is not PENDING', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({ userId, status: BORROWING_STATUS.BORROWED });
        mockBorrowingFindById.mockResolvedValue(borrowing);

        await expect(
            borrowingService.cancelBorrowing(borrowing._id!.toString(), userId.toString())
        ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STATUS' });
    });
});

describe('borrowingService.renewBorrowing', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renews an active borrowing and increments renewalCount', async () => {
        const userId = new Types.ObjectId();
        const originalDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const borrowing = makeBorrowing({ userId, status: BORROWING_STATUS.BORROWED, renewalCount: 0, maxRenewals: 2, dueDate: originalDue });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        mockBorrowingSave.mockResolvedValue(borrowing);

        await borrowingService.renewBorrowing(borrowing._id!.toString(), userId.toString());

        expect(borrowing.renewalCount).toBe(1);
        expect(new Date(borrowing.dueDate!).getTime()).toBeGreaterThan(originalDue.getTime());
    });

    it('throws MAX_RENEWALS_REACHED when renewal limit exceeded', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({ userId, status: BORROWING_STATUS.BORROWED, renewalCount: 2, maxRenewals: 2 });
        mockBorrowingFindById.mockResolvedValue(borrowing);

        await expect(
            borrowingService.renewBorrowing(borrowing._id!.toString(), userId.toString())
        ).rejects.toMatchObject({ statusCode: 400, code: 'MAX_RENEWALS_REACHED' });
    });
});

describe('borrowingService.payFine', () => {
    beforeEach(() => vi.clearAllMocks());

    it('marks fine as paid', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({ userId, isFined: true, finePaid: false, fineAmount: 50000, status: BORROWING_STATUS.RETURNED });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        mockBorrowingSave.mockResolvedValue(borrowing);

        await borrowingService.payFine(borrowing._id!.toString());
        expect(borrowing.finePaid).toBe(true);
    });

    it('moves overdue to returned after fine is paid when book was already returned', async () => {
        const userId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            userId,
            isFined: true,
            finePaid: false,
            fineAmount: 50000,
            status: BORROWING_STATUS.OVERDUE,
            actualReturnDate: new Date(),
        });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        mockBorrowingSave.mockResolvedValue(borrowing);

        await borrowingService.payFine(borrowing._id!.toString());

        expect(borrowing.finePaid).toBe(true);
        expect(borrowing.status).toBe(BORROWING_STATUS.RETURNED);
    });

    it('throws NO_FINE when isFined is false', async () => {
        const borrowing = makeBorrowing({ isFined: false });
        mockBorrowingFindById.mockResolvedValue(borrowing);

        await expect(borrowingService.payFine(borrowing._id!.toString()))
            .rejects.toMatchObject({ statusCode: 400, code: 'NO_FINE' });
    });

    it('throws FINE_ALREADY_PAID when fine is already paid', async () => {
        const borrowing = makeBorrowing({ isFined: true, finePaid: true });
        mockBorrowingFindById.mockResolvedValue(borrowing);

        await expect(borrowingService.payFine(borrowing._id!.toString()))
            .rejects.toMatchObject({ statusCode: 400, code: 'FINE_ALREADY_PAID' });
    });

    it('allows receiving library librarian to confirm fine for cross-library return', async () => {
        const homeLibraryId = new Types.ObjectId();
        const receivingLibraryId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            libraryId: homeLibraryId,
            returnHandledLibraryId: receivingLibraryId as any,
            status: BORROWING_STATUS.RETURN_TRANSIT,
            isFined: true,
            finePaid: false,
            fineAmount: 50000,
        });
        mockBorrowingFindById.mockResolvedValue(borrowing);
        mockBorrowingSave.mockResolvedValue(borrowing);

        const receivingLibrarian = makeUser({ role: 'librarian', libraryId: receivingLibraryId }) as IUser;
        await borrowingService.payFine(borrowing._id!.toString(), receivingLibrarian);

        expect(borrowing.finePaid).toBe(true);
    });
});

describe('borrowingService.reportLostOrDamaged', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reports a book as lost and calculates penalty correctly', async () => {
        const userId = new Types.ObjectId();
        const bookId = new Types.ObjectId();
        const libraryId = new Types.ObjectId();
        
        const book = makeBook({ _id: bookId, price: 100000, title: 'Lost Book', totalCopies: 5 });
        const borrowing = makeBorrowing({ 
            userId, 
            libraryId, 
            status: BORROWING_STATUS.BORROWED, 
            fineAmount: 0,
            bookId: bookId as any
        });
        
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBookFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(book)
        });
        
        const requestingAdmin = makeUser({ role: 'admin' }) as IUser;

        await borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingAdmin, 'lost', 'User lost it');

        expect(borrowing.status).toBe(BORROWING_STATUS.LOST);
        expect(borrowing.fineAmount).toBe(300000); // 100000 * 3
        expect(borrowing.isFined).toBe(true);
        expect(borrowing.notes).toContain('[LOST]: User lost it');
        expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(userId, { isFined: true }, expect.any(Object));
        expect(mockBookFindByIdAndUpdate).toHaveBeenCalledWith(book._id, { $inc: { totalCopies: -1 } }, expect.any(Object));
        expect(mockBorrowingSave).toHaveBeenCalled();
    });

    it('reports a book as damaged and calculates penalty correctly', async () => {
        const bookId = new Types.ObjectId();
        const book = makeBook({ _id: bookId, price: 100000, totalCopies: 5 });
        const borrowing = makeBorrowing({ status: BORROWING_STATUS.BORROWED, bookId: bookId as any });
        
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBookFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(book)
        });
        
        const requestingAdmin = makeUser({ role: 'admin' }) as IUser;

        await borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingAdmin, 'damaged');

        expect(borrowing.status).toBe(BORROWING_STATUS.DAMAGED);
        expect(borrowing.fineAmount).toBe(200000); // 100000 * 2
    });

    it('resets finePaid when a new lost/damaged penalty is added', async () => {
        const bookId = new Types.ObjectId();
        const book = makeBook({ _id: bookId, price: 100000, totalCopies: 5 });
        const borrowing = makeBorrowing({
            status: BORROWING_STATUS.OVERDUE,
            fineAmount: 50000,
            finePaid: true,
            bookId: bookId as any,
        });

        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBookFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(book)
        });

        const requestingAdmin = makeUser({ role: 'admin' }) as IUser;

        await borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingAdmin, 'damaged');

        expect(borrowing.fineAmount).toBe(250000);
        expect(borrowing.finePaid).toBe(false);
    });

    it('throws FORBIDDEN when librarian acts on another library', async () => {
        const borrowing = makeBorrowing({ libraryId: new Types.ObjectId(), status: BORROWING_STATUS.BORROWED });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        
        const requestingLibrarian = makeUser({ role: 'librarian', libraryId: new Types.ObjectId() }) as IUser;

        await expect(
            borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingLibrarian, 'lost')
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('throws INVALID_STATUS when borrowing is already returned', async () => {
        const borrowing = makeBorrowing({ status: BORROWING_STATUS.RETURNED });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        
        const requestingAdmin = makeUser({ role: 'admin' }) as IUser;

        await expect(
            borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingAdmin, 'lost')
        ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STATUS' });
    });

    it('throws ALREADY_REPORTED when borrowing is already lost', async () => {
        const borrowing = makeBorrowing({ status: BORROWING_STATUS.LOST });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        
        const requestingAdmin = makeUser({ role: 'admin' }) as IUser;

        await expect(
            borrowingService.reportLostOrDamaged(borrowing._id!.toString(), requestingAdmin, 'lost')
        ).rejects.toMatchObject({ statusCode: 400, code: 'ALREADY_REPORTED' });
    });
});

describe('borrowingService.returnBook', () => {
    beforeEach(() => vi.clearAllMocks());

    it('rejects cross-library return on standard return route', async () => {
        const homeLibraryId = new Types.ObjectId();
        const receivingLibraryId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            libraryId: homeLibraryId,
            status: BORROWING_STATUS.BORROWED,
            bookId: new Types.ObjectId(),
        });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBorrowingSave.mockResolvedValue(borrowing);

        const receivingLibrarian = makeUser({ role: 'librarian', libraryId: receivingLibraryId }) as IUser;

        await expect(
            borrowingService.returnBook(borrowing._id!.toString(), receivingLibrarian)
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });
});

describe('borrowingService.receiveCrossLibraryReturn', () => {
    beforeEach(() => vi.clearAllMocks());

    it('marks borrowing as RETURN_TRANSIT and does not restore stock immediately', async () => {
        const homeLibraryId = new Types.ObjectId();
        const receivingLibraryId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            libraryId: homeLibraryId,
            status: BORROWING_STATUS.BORROWED,
            bookId: new Types.ObjectId(),
        });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBorrowingSave.mockResolvedValue(borrowing);

        const receivingLibrarian = makeUser({ role: 'librarian', libraryId: receivingLibraryId }) as IUser;

        await borrowingService.receiveCrossLibraryReturn(borrowing._id!.toString(), receivingLibrarian);

        expect(borrowing.status).toBe(BORROWING_STATUS.RETURN_TRANSIT);
        expect(String(borrowing.returnHandledLibraryId)).toBe(receivingLibraryId.toString());
        expect(mockIncrement).not.toHaveBeenCalled();
    });
});

describe('borrowingService.receiveTransitReturn', () => {
    beforeEach(() => vi.clearAllMocks());

    it('finalizes inbound transit at home library and restores stock', async () => {
        const homeLibraryId = new Types.ObjectId();
        const bookId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            libraryId: homeLibraryId,
            bookId,
            status: BORROWING_STATUS.RETURN_TRANSIT,
            isFined: false,
            fineAmount: 0,
        });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBorrowingSave.mockResolvedValue(borrowing);

        const homeLibrarian = makeUser({ role: 'librarian', libraryId: homeLibraryId }) as IUser;

        await borrowingService.receiveTransitReturn(borrowing._id!.toString(), homeLibrarian);

        expect(borrowing.status).toBe(BORROWING_STATUS.RETURNED);
        expect(borrowing.transitCompletedAt).toBeDefined();
        expect(mockIncrement).toHaveBeenCalledWith(bookId.toString(), expect.anything());
    });

    it('marks as RETURNED when fine exists but has already been paid', async () => {
        const homeLibraryId = new Types.ObjectId();
        const borrowing = makeBorrowing({
            libraryId: homeLibraryId,
            status: BORROWING_STATUS.RETURN_TRANSIT,
            isFined: true,
            fineAmount: 50000,
            finePaid: true,
        });
        mockBorrowingFindById.mockReturnValue({
            session: vi.fn().mockResolvedValue(borrowing)
        });
        mockBorrowingSave.mockResolvedValue(borrowing);

        const homeLibrarian = makeUser({ role: 'librarian', libraryId: homeLibraryId }) as IUser;
        await borrowingService.receiveTransitReturn(borrowing._id!.toString(), homeLibrarian);

        expect(borrowing.status).toBe(BORROWING_STATUS.RETURNED);
    });
});

describe('borrowingService.lookupCrossLibraryReturnCandidates', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws NO_LIBRARY_ASSIGNED for librarian without library', async () => {
        const librarian = makeUser({ role: 'librarian', libraryId: undefined }) as IUser;

        await expect(
            borrowingService.lookupCrossLibraryReturnCandidates({ q: 'harry', limit: 10 }, librarian)
        ).rejects.toMatchObject({ statusCode: 403, code: 'NO_LIBRARY_ASSIGNED' });
    });

    it('returns candidates from other libraries only', async () => {
        const librarianLibraryId = new Types.ObjectId();
        const otherLibraryBorrowing = makeBorrowing({
            status: BORROWING_STATUS.BORROWED,
            libraryId: new Types.ObjectId(),
        });

        mockBookFind.mockImplementation(() => ({
            select: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
        }));
        mockUserFind.mockImplementation(() => ({
            select: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
        }));
        mockBorrowingFind.mockImplementation(() => ({
            sort: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([otherLibraryBorrowing]),
            }),
        }));

        const librarian = makeUser({ role: 'librarian', libraryId: librarianLibraryId }) as IUser;
        const result = await borrowingService.lookupCrossLibraryReturnCandidates({ q: 'an', limit: 8 }, librarian);

        expect(result).toHaveLength(1);
        expect(mockBorrowingFind).toHaveBeenCalledWith(
            expect.objectContaining({
                libraryId: { $ne: librarianLibraryId },
            })
        );
    });
});
