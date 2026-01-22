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
 * Update book availability
 */
export const updateAvailability = async (id: string, change: number): Promise<IBook> => {
    const book = await Book.findById(id) as IBook | null;

    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    book.availableCopies = Math.max(0, book.availableCopies + change);
    await book.save();

    return book;
};
