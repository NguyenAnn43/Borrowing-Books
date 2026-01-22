// User types
export interface IUser {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    avatar?: string;
    role: "admin" | "librarian" | "user";
    libraryId?: ILibrary;
    status: "active" | "inactive" | "banned";
    maxBorrowLimit: number;
    createdAt: string;
    updatedAt: string;
}

// Library types
export interface ILibrary {
    _id: string;
    name: string;
    code: string;
    address: string;
    phone?: string;
    email?: string;
    status: "active" | "inactive";
    workingHours: {
        open: string;
        close: string;
    };
    description?: string;
    createdAt: string;
    updatedAt: string;
}

// Book types
export interface IBook {
    _id: string;
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
    libraryId: ILibrary;
    totalCopies: number;
    availableCopies: number;
    status: "available" | "unavailable";
    createdAt: string;
    updatedAt: string;
}

// Borrowing types
export interface IBorrowing {
    _id: string;
    userId: Pick<IUser, "_id" | "fullName" | "email">;
    bookId: Pick<IBook, "_id" | "title" | "author" | "coverImage">;
    libraryId: Pick<ILibrary, "_id" | "name" | "code">;
    borrowDate: string;
    dueDate: string;
    returnDate?: string;
    actualReturnDate?: string;
    status: "pending" | "borrowed" | "returned" | "overdue";
    fineAmount: number;
    isFined: boolean;
    notes?: string;
    overdueDays?: number;
    createdAt: string;
    updatedAt: string;
}

// Reservation types
export interface IReservation {
    _id: string;
    userId: Pick<IUser, "_id" | "fullName" | "email">;
    bookId: Pick<IBook, "_id" | "title" | "author" | "coverImage">;
    libraryId: Pick<ILibrary, "_id" | "name" | "code">;
    reservationDate: string;
    expiryDate: string;
    status: "pending" | "ready" | "completed" | "cancelled" | "expired";
    createdAt: string;
    updatedAt: string;
}

// Notification types
export interface INotification {
    _id: string;
    userId: string;
    title: string;
    message: string;
    type: "borrowing" | "reservation" | "overdue" | "system";
    isRead: boolean;
    createdAt: string;
}

// Auth types
export interface ILoginRequest {
    email: string;
    password: string;
}

export interface IRegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
}

export interface IAuthResponse {
    user: IUser;
    accessToken: string;
}

// Pagination
export interface IPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
