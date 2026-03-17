import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const {
    mockBookFindById,
    mockBookFind,
    mockGetWishlistedSet,
} = vi.hoisted(() => ({
    mockBookFindById: vi.fn(),
    mockBookFind: vi.fn(),
    mockGetWishlistedSet: vi.fn(),
}));

vi.mock('../models', () => ({
    Book: {
        findById: mockBookFindById,
        find: mockBookFind,
        countDocuments: vi.fn(),
    },
}));

vi.mock('./wishlistService', () => ({
    getWishlistedBookIdSet: mockGetWishlistedSet,
}));

import * as bookService from './bookService';

const makeBook = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    title: 'Clean Code',
    author: 'Robert C. Martin',
    libraryId: new Types.ObjectId(),
    isbn: '978-604-123-4501',
    isbnNormalized: '9786041234501',
    availableCopies: 2,
    totalCopies: 5,
    category: 'Software Engineering',
    status: 'available',
    ...overrides,
});

describe('bookService.getBookAlternatives', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('matches alternatives by normalized ISBN and excludes same library', async () => {
        const source = makeBook();
        const alternativeA = makeBook({ _id: new Types.ObjectId(), libraryId: new Types.ObjectId() });
        const alternativeB = makeBook({ _id: new Types.ObjectId(), libraryId: new Types.ObjectId() });

        mockBookFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(source),
        });

        const sort = vi.fn().mockResolvedValue([alternativeA, alternativeB]);
        const populate = vi.fn().mockReturnValue({ sort });
        mockBookFind.mockReturnValue({ populate });
        mockGetWishlistedSet.mockResolvedValue(new Set([alternativeA._id.toString()]));

        const result = await bookService.getBookAlternatives(source._id.toString(), new Types.ObjectId().toString());

        expect(result.matchedBy).toBe('isbn');
        expect(mockBookFind).toHaveBeenCalledWith(expect.objectContaining({
            isbnNormalized: source.isbnNormalized,
            libraryId: { $ne: source.libraryId },
        }));
        expect(result.alternatives).toHaveLength(2);
        expect(result.alternatives[0]).toBeDefined();
        expect(result.alternatives[0]!.isWishlisted).toBe(true);
    });

    it('falls back to title-author matching when ISBN is missing', async () => {
        const source = makeBook({ isbn: undefined, isbnNormalized: null });

        mockBookFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(source),
        });

        const sort = vi.fn().mockResolvedValue([]);
        const populate = vi.fn().mockReturnValue({ sort });
        mockBookFind.mockReturnValue({ populate });

        const result = await bookService.getBookAlternatives(source._id.toString());

        expect(result.matchedBy).toBe('title-author');
        expect(mockBookFind).toHaveBeenCalledWith(expect.objectContaining({
            title: source.title,
            author: source.author,
        }));
        expect(result.alternatives).toHaveLength(0);
    });

    it('throws BOOK_NOT_FOUND when source book is missing', async () => {
        mockBookFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(null),
        });

        await expect(bookService.getBookAlternatives(new Types.ObjectId().toString()))
            .rejects.toMatchObject({ statusCode: 404, code: 'BOOK_NOT_FOUND' });
    });
});
