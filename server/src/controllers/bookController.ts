import { Request, Response } from 'express';
import { bookService } from '../services';
import { asyncHandler } from '../utils';

/**
 * Get all books
 */
export const getBooks = asyncHandler(async (req: Request, res: Response) => {
    const result = await bookService.getBooks(req.query as unknown as Parameters<typeof bookService.getBooks>[0]);

    res.json({
        success: true,
        data: result.books,
        meta: result.pagination,
    });
});

/**
 * Get book by ID
 */
export const getBookById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const book = await bookService.getBookById(id);

    res.json({
        success: true,
        data: book,
    });
});

/**
 * Create new book
 */
export const createBook = asyncHandler(async (req: Request, res: Response) => {
    const book = await bookService.createBook(req.body);

    res.status(201).json({
        success: true,
        data: book,
        message: 'Book created successfully',
    });
});

/**
 * Update book
 */
export const updateBook = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const book = await bookService.updateBook(id, req.body);

    res.json({
        success: true,
        data: book,
        message: 'Book updated successfully',
    });
});

/**
 * Delete book
 */
export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await bookService.deleteBook(id);

    res.json({
        success: true,
        message: 'Book deleted successfully',
    });
});
