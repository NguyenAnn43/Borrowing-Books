import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';

// User types
export interface IUser extends Document {
    _id: Types.ObjectId;
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    avatar?: string;
    role: 'admin' | 'librarian' | 'user' | 'guest';
    libraryId?: Types.ObjectId;
    status: 'active' | 'inactive' | 'banned';
    maxBorrowLimit: number;
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// Library types
export interface ILibrary extends Document {
    _id: Types.ObjectId;
    name: string;
    code: string;
    address: string;
    phone?: string;
    email?: string;
    status: 'active' | 'inactive';
    workingHours: {
        open: string;
        close: string;
    };
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Book types
export interface IBook extends Document {
    _id: Types.ObjectId;
    isbn?: string;
    title: string;
    author: string;
    publisher?: string;
    publishYear?: number;
    category: string;
    description?: string;
    coverImage?: string;
    language: string;
    pageCount?: number;
    tags: string[];
    location?: string;
    libraryId: Types.ObjectId;
    totalCopies: number;
    availableCopies: number;
    status: 'available' | 'unavailable';
    createdAt: Date;
    updatedAt: Date;
}

// Borrowing types
export interface IBorrowing extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    bookId: Types.ObjectId;
    libraryId: Types.ObjectId;
    borrowDate: Date;
    dueDate: Date;
    /**
     * @deprecated Use `actualReturnDate` instead.
     * Kept for backwards-compat; mirrored from `actualReturnDate` on save.
     */
    returnDate?: Date;
    actualReturnDate?: Date;
    status: 'pending' | 'borrowed' | 'returned' | 'overdue' | 'cancelled';
    fineAmount: number;
    isFined: boolean;
    /** Whether the fine has been paid by the user */
    finePaid: boolean;
    /** Number of times this borrowing has been renewed */
    renewalCount: number;
    /** Maximum allowed renewals */
    maxRenewals: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    checkOverdue(): void;
}

// Reservation types
export interface IReservation extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    bookId: Types.ObjectId;
    libraryId: Types.ObjectId;
    reservationDate: Date;
    /** Only set when status transitions to READY */
    expiryDate?: Date;
    status: 'pending' | 'ready' | 'completed' | 'cancelled' | 'expired';
    /** Set when reservation is fulfilled — links to the Borrowing record */
    borrowingId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    checkExpiry(): void;
}

// Notification types
export interface INotification extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: 'borrowing' | 'reservation' | 'overdue' | 'system';
    isRead: boolean;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

// Express extended types
export interface AuthRequest extends Request {
    user?: IUser;
}

// Controller type
export type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

// Pagination types
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// API Response types
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: PaginationMeta;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
