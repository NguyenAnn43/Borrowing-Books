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
    RETURN_TRANSIT: 'return_transit',
    CANCELLED: 'cancelled',
    LOST: 'lost',
    DAMAGED: 'damaged',
} as const;

export const RESERVATION_STATUS = {
    PENDING: 'pending',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const;

export const TRANSIT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IN_TRANSIT: 'in_transit',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export const NOTIFICATION_TYPE = {
    BORROWING: 'borrowing',
    RESERVATION: 'reservation',
    OVERDUE: 'overdue',
    SYSTEM: 'system',
} as const;

export const REVIEW_REPORT_STATUS = {
    PENDING: 'pending',
    RESOLVED: 'resolved',
} as const;

export const REVIEW_ADMIN_ACTION = {
    KEEP: 'keep',
    HIDE: 'hide',
    DELETE: 'delete',
} as const;

export const BOOK_CATEGORIES = [
    'Công nghệ thông tin',
    'Khoa học tự nhiên',
    'Khoa học xã hội',
    'Kinh tế',
    'Lịch sử',
    'Văn học',
    'Ngoại ngữ',
    'Giáo dục',
    'Nghệ thuật',
    'Y học',
    'Luật',
    'Triết học',
    'Khác',
] as const;

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
    OVERDUE_FINE_PER_DAY: 5000,
    MAX_RENEWALS: 2,
    RENEWAL_DAYS: 7,
    LOST_PENALTY_MULTIPLIER: 3,
    DAMAGED_PENALTY_MULTIPLIER: 2,
} as const;

// Reservation settings
export const RESERVATION_SETTINGS = {
    EXPIRY_DAYS: 3,
} as const;

// Types
export type Role = typeof ROLES[keyof typeof ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type LibraryStatus = typeof LIBRARY_STATUS[keyof typeof LIBRARY_STATUS];
export type BookStatus = typeof BOOK_STATUS[keyof typeof BOOK_STATUS];
export type BorrowingStatus = typeof BORROWING_STATUS[keyof typeof BORROWING_STATUS];
export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS];
export type TransitStatus = typeof TRANSIT_STATUS[keyof typeof TRANSIT_STATUS];
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export type ReviewReportStatus = typeof REVIEW_REPORT_STATUS[keyof typeof REVIEW_REPORT_STATUS];
export type ReviewAdminAction = typeof REVIEW_ADMIN_ACTION[keyof typeof REVIEW_ADMIN_ACTION];
export type BookCategory = typeof BOOK_CATEGORIES[number];
