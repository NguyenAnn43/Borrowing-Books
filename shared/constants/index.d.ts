export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly LIBRARIAN: "librarian";
    readonly USER: "user";
    readonly GUEST: "guest";
};
export declare const USER_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly BANNED: "banned";
};
export declare const LIBRARY_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
};
export declare const BOOK_STATUS: {
    readonly AVAILABLE: "available";
    readonly UNAVAILABLE: "unavailable";
};
export declare const BORROWING_STATUS: {
    readonly PENDING: "pending";
    readonly BORROWED: "borrowed";
    readonly RETURNED: "returned";
    readonly OVERDUE: "overdue";
    /** User cancelled the pending request */
    readonly CANCELLED: "cancelled";
};
export declare const RESERVATION_STATUS: {
    readonly PENDING: "pending";
    readonly READY: "ready";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
    readonly EXPIRED: "expired";
};
export declare const NOTIFICATION_TYPE: {
    readonly BORROWING: "borrowing";
    readonly RESERVATION: "reservation";
    readonly OVERDUE: "overdue";
    readonly SYSTEM: "system";
};
export declare const BOOK_CATEGORIES: readonly ["Công nghệ thông tin", "Khoa học tự nhiên", "Khoa học xã hội", "Kinh tế", "Lịch sử", "Văn học", "Ngoại ngữ", "Giáo dục", "Nghệ thuật", "Y học", "Luật", "Triết học", "Khác"];
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 10;
    readonly MAX_LIMIT: 100;
};
export declare const BORROWING_SETTINGS: {
    readonly DEFAULT_BORROW_DAYS: 14;
    readonly MAX_BORROW_LIMIT: 5;
    readonly OVERDUE_FINE_PER_DAY: 5000;
    /** Max number of renewals per borrowing */
    readonly MAX_RENEWALS: 2;
    /** Extension per renewal in days */
    readonly RENEWAL_DAYS: 7;
};
export declare const RESERVATION_SETTINGS: {
    /** Days before a READY reservation expires */
    readonly EXPIRY_DAYS: 3;
};
export type Role = typeof ROLES[keyof typeof ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type LibraryStatus = typeof LIBRARY_STATUS[keyof typeof LIBRARY_STATUS];
export type BookStatus = typeof BOOK_STATUS[keyof typeof BOOK_STATUS];
export type BorrowingStatus = typeof BORROWING_STATUS[keyof typeof BORROWING_STATUS];
export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS];
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export type BookCategory = typeof BOOK_CATEGORIES[number];
//# sourceMappingURL=index.d.ts.map