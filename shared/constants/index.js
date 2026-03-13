"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVATION_SETTINGS = exports.BORROWING_SETTINGS = exports.PAGINATION = exports.BOOK_CATEGORIES = exports.NOTIFICATION_TYPE = exports.RESERVATION_STATUS = exports.BORROWING_STATUS = exports.BOOK_STATUS = exports.LIBRARY_STATUS = exports.USER_STATUS = exports.ROLES = void 0;
// Role constants
exports.ROLES = {
    ADMIN: 'admin',
    LIBRARIAN: 'librarian',
    USER: 'user',
    GUEST: 'guest',
};
// Status constants
exports.USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BANNED: 'banned',
};
exports.LIBRARY_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
};
exports.BOOK_STATUS = {
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
};
exports.BORROWING_STATUS = {
    PENDING: 'pending',
    BORROWED: 'borrowed',
    RETURNED: 'returned',
    OVERDUE: 'overdue',
    /** User cancelled the pending request */
    CANCELLED: 'cancelled',
};
exports.RESERVATION_STATUS = {
    PENDING: 'pending',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
};
exports.NOTIFICATION_TYPE = {
    BORROWING: 'borrowing',
    RESERVATION: 'reservation',
    OVERDUE: 'overdue',
    SYSTEM: 'system',
};
// Book categories — canonical list (SSOT)
exports.BOOK_CATEGORIES = [
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
];
// Pagination defaults
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};
// Borrowing settings
exports.BORROWING_SETTINGS = {
    DEFAULT_BORROW_DAYS: 14,
    MAX_BORROW_LIMIT: 5,
    OVERDUE_FINE_PER_DAY: 5000, // VND
    /** Max number of renewals per borrowing */
    MAX_RENEWALS: 2,
    /** Extension per renewal in days */
    RENEWAL_DAYS: 7,
};
// Reservation settings
exports.RESERVATION_SETTINGS = {
    /** Days before a READY reservation expires */
    EXPIRY_DAYS: 3,
};
//# sourceMappingURL=index.js.map