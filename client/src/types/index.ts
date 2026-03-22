// User types
export interface IUser {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    avatar?: string;
    role: "admin" | "librarian" | "user" | "guest";
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
    wishlistCount?: number;
    averageRating?: number;
    isWishlisted?: boolean;
    status: "available" | "unavailable";
    createdAt: string;
    updatedAt: string;
}

export interface IWishlistItem {
    _id: string;
    bookId: string;
    title: string;
    author: string;
    coverImage?: string;
    category: string;
    wishlistCount: number;
    createdAt: string;
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
    status: "pending" | "borrowed" | "returned" | "overdue" | "cancelled";
    fineAmount: number;
    isFined: boolean;
    finePaid?: boolean;
    renewalCount?: number;
    maxRenewals?: number;
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

// Review types
export interface IReviewUserSnapshot {
    _id: string;
    fullName?: string;
    avatar?: string;
}

export interface IBookReview {
    _id: string;
    userId: IReviewUserSnapshot;
    bookId: Pick<IBook, '_id' | 'title' | 'author' | 'coverImage'>;
    libraryId: Pick<ILibrary, '_id' | 'name' | 'code'>;
    stars: number;
    comment?: string;
    images: string[];
    isHidden: boolean;
    hiddenReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ILibraryReview {
    _id: string;
    userId: IReviewUserSnapshot;
    libraryId: Pick<ILibrary, '_id' | 'name' | 'code'>;
    stars: number;
    comment?: string;
    images: string[];
    isHidden: boolean;
    hiddenReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface IReviewReport {
    _id: string;
    reviewType: 'book' | 'library';
    reviewId: IBookReview | ILibraryReview | string;
    reporterId: Pick<IUser, '_id' | 'fullName' | 'email' | 'role'>;
    reason: string;
    status: 'pending' | 'resolved';
    adminAction?: 'keep' | 'hide' | 'delete';
    adminNote?: string;
    resolvedBy?: Pick<IUser, '_id' | 'fullName' | 'role'>;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ILibrarianReviewDashboardItem {
    reviewType: 'book' | 'library';
    reviewId: string;
    stars: number;
    comment?: string;
    images: string[];
    isHidden: boolean;
    createdAt: string;
    user: {
        _id: string;
        fullName?: string;
        avatar?: string;
    };
    library: {
        _id: string;
        name?: string;
        code?: string;
    };
    book?: {
        _id: string;
        title?: string;
        author?: string;
        coverImage?: string;
    };
}

export interface ILibrarianReviewDashboard {
    latest: ILibrarianReviewDashboardItem[];
    lowStar: ILibrarianReviewDashboardItem[];
    withImages: ILibrarianReviewDashboardItem[];
}

export interface IPayment {
    _id: string;
    userId?: Pick<IUser, "_id" | "fullName" | "email">;
    borrowingId?: {
        _id: string;
        bookId?: Pick<IBook, "_id" | "title" | "author">;
        dueDate?: string;
        fineAmount?: number;
        status?: IBorrowing["status"];
        finePaid?: boolean;
    };
    provider: "vnpay";
    status: "pending" | "success" | "failed";
    amount: number;
    txnRef: string;
    vnpTxnNo?: string;
    vnpResponseCode?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
}

// Auth types
export interface ILoginRequest {
    email: string;
    password: string;
}

export interface IRegisterRequest {
    email: string;
    emailVerificationToken: string;
    password: string;
    fullName: string;
    phone?: string;
}

export interface IRequestRegisterOtpResponse {
    expiresInSeconds: number;
}

export interface IVerifyRegisterOtpResponse {
    verificationToken: string;
    expiresInSeconds: number;
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
