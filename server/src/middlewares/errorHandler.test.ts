import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from './errorHandler';
import { AppError } from '../utils';

describe('errorHandler duplicate key mapping', () => {
    const req = {
        originalUrl: '/api/books',
        method: 'POST',
    } as any;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    } as any;

    const next = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps Mongo E11000 (libraryId + isbnNormalized) to 409 BOOK_DUPLICATE_IN_LIBRARY', () => {
        const err = {
            name: 'MongoServerError',
            code: 11000,
            keyPattern: { libraryId: 1, isbnNormalized: 1 },
            keyValue: { libraryId: 'lib1', isbnNormalized: '9786041234501' },
            message: 'E11000 duplicate key error',
        } as Error;

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'BOOK_DUPLICATE_IN_LIBRARY',
                message: 'A book with this ISBN already exists in the selected library',
            }),
        }));
    });

    it('keeps existing AppError unchanged', () => {
        const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR');

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
            }),
        }));
    });
});
