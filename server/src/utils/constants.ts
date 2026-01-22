// Role constants
export const ROLES = {
    ADMIN: 'admin',
    LIBRARIAN: 'librarian',
    USER: 'user',
    GUEST: 'guest',
} as const;

// Status constants
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BANNED: 'banned',
} as const;

export const LIBRARY_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const BOOK_STATUS = {
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
} as const;

export const BORROWING_STATUS = {
    PENDING: 'pending',
    BORROWED: 'borrowed',
    RETURNED: 'returned',
    OVERDUE: 'overdue',
} as const;

export const RESERVATION_STATUS = {
    PENDING: 'pending',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const;

export const NOTIFICATION_TYPE = {
    BORROWING: 'borrowing',
    RESERVATION: 'reservation',
    OVERDUE: 'overdue',
    SYSTEM: 'system',
} as const;

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
} as const;

// Borrowing settings
export const BORROWING_SETTINGS = {
    DEFAULT_BORROW_DAYS: 14,
    MAX_BORROW_LIMIT: 5,
    OVERDUE_FINE_PER_DAY: 5000, // VND
} as const;

// Types
export type Role = typeof ROLES[keyof typeof ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type LibraryStatus = typeof LIBRARY_STATUS[keyof typeof LIBRARY_STATUS];
export type BookStatus = typeof BOOK_STATUS[keyof typeof BOOK_STATUS];
export type BorrowingStatus = typeof BORROWING_STATUS[keyof typeof BORROWING_STATUS];
export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS];
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
