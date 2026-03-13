import { ClientSession } from 'mongoose';
import { Book } from '../models';
import { AppError, formatPagination, sanitizeObject, PAGINATION } from '../utils';
import { IBook, PaginationMeta } from '../types';
import { SearchBooksQuery, CreateBookInput, UpdateBookInput } from '../validators/bookSchema';

interface GetBooksResult {
    books: IBook[];
    pagination: PaginationMeta;
}

/**
 * Get all books with pagination and filters
 */
export const getBooks = async (params: SearchBooksQuery): Promise<GetBooksResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, q, category, libraryId, status } = params;

    const query: Record<string, unknown> = sanitizeObject({ category, libraryId, status });

    // Text search
    if (q) {
        query.$or = [
            { title: { $regex: q, $options: 'i' } },
            { author: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
        ];
    }

    const skip = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const [books, total] = await Promise.all([
        Book.find(query)
            .populate('libraryId', 'name code')
            .skip(skip)
            .limit(actualLimit)
            .sort({ createdAt: -1 }) as Promise<IBook[]>,
        Book.countDocuments(query),
    ]);

    return {
        books,
        pagination: formatPagination(page, actualLimit, total),
    };
};

/**
 * Get book by ID
 */
export const getBookById = async (id: string): Promise<IBook> => {
    const book = await Book.findById(id).populate('libraryId', 'name code address') as IBook | null;

    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    return book;
};

/**
 * Create new book
 */
export const createBook = async (bookData: CreateBookInput): Promise<IBook> => {
    const book = await Book.create(bookData);
    return book.populate('libraryId', 'name code') as unknown as IBook;
};

/**
 * Update book
 */
export const updateBook = async (id: string, updateData: UpdateBookInput): Promise<IBook> => {
    const book = await Book.findByIdAndUpdate(
        id,
        sanitizeObject(updateData),
        { new: true, runValidators: true }
    ).populate('libraryId', 'name code') as IBook | null;

    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    return book;
};

/**
 * Delete book
 */
export const deleteBook = async (id: string): Promise<IBook> => {
    const book = await Book.findByIdAndDelete(id) as IBook | null;

    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    return book;
};

/**
 * Atomically decrement availableCopies only if > 0.
 * Returns the updated book, or throws BOOK_UNAVAILABLE if no copies left.
 * Accepts an optional Mongoose session for use within transactions.
 */
export const decrementAvailabilityAtomic = async (
    id: string,
    session?: ClientSession
): Promise<IBook> => {
    const book = await Book.findOneAndUpdate(
        { _id: id, availableCopies: { $gt: 0 } },
        { $inc: { availableCopies: -1 } },
        { new: true, session }
    ) as IBook | null;

    if (!book) {
        throw new AppError('Book is not available (no copies left)', 400, 'BOOK_UNAVAILABLE');
    }

    return book;
};

/**
 * Atomically increment availableCopies.
 * Accepts an optional Mongoose session for use within transactions.
 */
export const incrementAvailabilityAtomic = async (
    id: string,
    session?: ClientSession
): Promise<IBook> => {
    const book = await Book.findByIdAndUpdate(
        id,
        { $inc: { availableCopies: 1 } },
        { new: true, session }
    ) as IBook | null;

    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    return book;
};

/**
 * @deprecated Use decrementAvailabilityAtomic or incrementAvailabilityAtomic instead.
 */
export const updateAvailability = async (id: string, change: number): Promise<IBook> => {
    if (change < 0) {
        return decrementAvailabilityAtomic(id);
    }
    return incrementAvailabilityAtomic(id);
};
