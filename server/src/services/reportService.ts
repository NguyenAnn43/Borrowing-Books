import { Types } from 'mongoose';
import { Borrowing, Payment } from '../models';
import { IUser } from '../types';
import { AppError, BORROWING_STATUS, ROLES } from '../utils';
import {
    DashboardReportQuery,
    FineRevenueReportQuery,
    LateReturnRateReportQuery,
    TopBorrowedBooksReportQuery,
    UserActivityReportQuery,
} from '../validators/reportSchema';

interface MonthlyFineRevenueItem {
    year: number;
    month: number;
    label: string;
    totalRevenue: number;
    successfulPayments: number;
}

interface MonthlyFineIncurredItem {
    year: number;
    month: number;
    label: string;
    totalFineIncurred: number;
    finedBorrowings: number;
}

interface TopBorrowedBookItem {
    bookId: string;
    title: string;
    author: string;
    coverImage: string | null;
    totalBorrowings: number;
    uniqueBorrowers: number;
}

interface LateReturnRateResult {
    totalConsidered: number;
    lateOrOverdueCount: number;
    onTimeCount: number;
    lateReturnRate: number;
}

interface UserActivitySummary {
    totalUsersWithBorrowings: number;
    activeUsers: number;
    violators: number;
    activeRate: number;
    violationRate: number;
    overlapCount: number;
    activityThreshold: number;
}

interface UserActivityMember {
    userId: string;
    fullName: string;
    email: string;
    totalBorrowings: number;
    violationCount: number;
    isActive: boolean;
    isViolator: boolean;
}

interface UserActivityReportResult {
    summary: UserActivitySummary;
    topActiveUsers: UserActivityMember[];
    topViolators: UserActivityMember[];
}

interface DashboardReportResult {
    fineRevenueByMonth: MonthlyFineRevenueItem[];
    fineIncurredByMonth: MonthlyFineIncurredItem[];
    topBorrowedBooks: TopBorrowedBookItem[];
    lateReturnRate: LateReturnRateResult;
    userActivity: UserActivityReportResult;
}

type DateRange = {
    from?: Date;
    to?: Date;
};

const BORROW_COUNTABLE_STATUSES = [
    BORROWING_STATUS.BORROWED,
    BORROWING_STATUS.OVERDUE,
    BORROWING_STATUS.RETURNED,
    BORROWING_STATUS.RETURN_TRANSIT,
    BORROWING_STATUS.LOST,
    BORROWING_STATUS.DAMAGED,
] as const;

const LATE_RATE_STATUSES = [
    BORROWING_STATUS.BORROWED,
    BORROWING_STATUS.OVERDUE,
    BORROWING_STATUS.RETURNED,
    BORROWING_STATUS.RETURN_TRANSIT,
] as const;

const getLibraryScope = (requestingUser: IUser): { libraryId?: Types.ObjectId } => {
    if (requestingUser.role === ROLES.LIBRARIAN) {
        if (!requestingUser.libraryId) {
            throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
        }

        const libraryObjectId = requestingUser.libraryId as Types.ObjectId;
        return { libraryId: libraryObjectId };
    }

    return {};
};

const resolveDateRange = (
    range: { from?: string; to?: string },
    fallbackMonths: number
): DateRange => {
    const hasFrom = typeof range.from === 'string' && range.from.trim().length > 0;
    const hasTo = typeof range.to === 'string' && range.to.trim().length > 0;

    const to = hasTo ? new Date(range.to!) : new Date();
    const from = hasFrom
        ? new Date(range.from!)
        : new Date(to.getFullYear(), to.getMonth() - Math.max(fallbackMonths - 1, 0), 1, 0, 0, 0, 0);

    return {
        from,
        to,
    };
};

const buildDateMatch = (field: string, dateRange: DateRange): Record<string, unknown> => {
    const clause: Record<string, unknown> = {};

    if (dateRange.from) clause.$gte = dateRange.from;
    if (dateRange.to) clause.$lte = dateRange.to;

    if (Object.keys(clause).length === 0) return {};

    return {
        [field]: clause,
    };
};

const monthLabel = (year: number, month: number): string => `${month.toString().padStart(2, '0')}/${year}`;

const generateMonthBuckets = (dateRange: DateRange): Array<{ year: number; month: number; label: string }> => {
    const end = dateRange.to ? new Date(dateRange.to) : new Date();
    const start = dateRange.from ? new Date(dateRange.from) : new Date(end.getFullYear(), end.getMonth(), 1);

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    const buckets: Array<{ year: number; month: number; label: string }> = [];

    while (cursor.getTime() <= last.getTime()) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;

        buckets.push({
            year,
            month,
            label: monthLabel(year, month),
        });

        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
};

export const getFineRevenueByMonth = async (
    requestingUser: IUser,
    query: FineRevenueReportQuery
): Promise<MonthlyFineRevenueItem[]> => {
    const scope = getLibraryScope(requestingUser);
    const dateRange = resolveDateRange(query, query.months);
    const paidAtMatch = buildDateMatch('paidAt', dateRange);

    const paymentMatch: Record<string, unknown> = {
        status: 'success',
        ...paidAtMatch,
    };

    const raw = await Payment.aggregate<{ _id: { year: number; month: number }; totalRevenue: number; successfulPayments: number }>([
        { $match: paymentMatch },
        {
            $lookup: {
                from: 'borrowings',
                localField: 'borrowingId',
                foreignField: '_id',
                as: 'borrowing',
            },
        },
        {
            $addFields: {
                effectiveLibraryId: {
                    $ifNull: [
                        '$paidLibraryId',
                        { $arrayElemAt: ['$borrowing.libraryId', 0] },
                    ],
                },
            },
        },
        ...(scope.libraryId ? [{ $match: { effectiveLibraryId: scope.libraryId } }] : []),
        {
            $group: {
                _id: {
                    year: { $year: '$paidAt' },
                    month: { $month: '$paidAt' },
                },
                totalRevenue: { $sum: '$amount' },
                successfulPayments: { $sum: 1 },
            },
        },
        {
            $sort: {
                '_id.year': 1,
                '_id.month': 1,
            },
        },
    ]);

    const monthMap = new Map<string, { totalRevenue: number; successfulPayments: number }>();
    for (const row of raw) {
        const key = `${row._id.year}-${row._id.month}`;
        monthMap.set(key, {
            totalRevenue: row.totalRevenue,
            successfulPayments: row.successfulPayments,
        });
    }

    const buckets = generateMonthBuckets(dateRange);

    return buckets.map((bucket) => {
        const key = `${bucket.year}-${bucket.month}`;
        const existing = monthMap.get(key);

        return {
            year: bucket.year,
            month: bucket.month,
            label: bucket.label,
            totalRevenue: existing?.totalRevenue ?? 0,
            successfulPayments: existing?.successfulPayments ?? 0,
        };
    });
};

export const getFineIncurredByMonth = async (
    requestingUser: IUser,
    query: FineRevenueReportQuery
): Promise<MonthlyFineIncurredItem[]> => {
    const scope = getLibraryScope(requestingUser);
    const dateRange = resolveDateRange(query, query.months);

    const match: Record<string, unknown> = {
        isFined: true,
        fineAmount: { $gt: 0 },
        ...buildDateMatch('dueDate', dateRange),
    };

    if (scope.libraryId) {
        match.libraryId = scope.libraryId;
    }

    const raw = await Borrowing.aggregate<{ _id: { year: number; month: number }; totalFineIncurred: number; finedBorrowings: number }>([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$dueDate' },
                    month: { $month: '$dueDate' },
                },
                totalFineIncurred: { $sum: '$fineAmount' },
                finedBorrowings: { $sum: 1 },
            },
        },
        {
            $sort: {
                '_id.year': 1,
                '_id.month': 1,
            },
        },
    ]);

    const monthMap = new Map<string, { totalFineIncurred: number; finedBorrowings: number }>();
    for (const row of raw) {
        const key = `${row._id.year}-${row._id.month}`;
        monthMap.set(key, {
            totalFineIncurred: row.totalFineIncurred,
            finedBorrowings: row.finedBorrowings,
        });
    }

    const buckets = generateMonthBuckets(dateRange);

    return buckets.map((bucket) => {
        const key = `${bucket.year}-${bucket.month}`;
        const existing = monthMap.get(key);

        return {
            year: bucket.year,
            month: bucket.month,
            label: bucket.label,
            totalFineIncurred: existing?.totalFineIncurred ?? 0,
            finedBorrowings: existing?.finedBorrowings ?? 0,
        };
    });
};

export const getTopBorrowedBooks = async (
    requestingUser: IUser,
    query: TopBorrowedBooksReportQuery
): Promise<TopBorrowedBookItem[]> => {
    const scope = getLibraryScope(requestingUser);
    const dateRange = resolveDateRange(query, 12);

    const match: Record<string, unknown> = {
        status: { $in: BORROW_COUNTABLE_STATUSES },
        ...buildDateMatch('borrowDate', dateRange),
    };

    if (scope.libraryId) {
        match.libraryId = scope.libraryId;
    }

    const rows = await Borrowing.aggregate<{
        _id: Types.ObjectId;
        totalBorrowings: number;
        borrowerIds: Types.ObjectId[];
        book: {
            _id: Types.ObjectId;
            title?: string;
            author?: string;
            coverImage?: string | null;
        }[];
    }>([
        { $match: match },
        {
            $group: {
                _id: '$bookId',
                totalBorrowings: { $sum: 1 },
                borrowerIds: { $addToSet: '$userId' },
            },
        },
        {
            $sort: {
                totalBorrowings: -1,
            },
        },
        {
            $limit: query.limit,
        },
        {
            $lookup: {
                from: 'books',
                localField: '_id',
                foreignField: '_id',
                as: 'book',
            },
        },
    ]);

    return rows.map((row) => {
        const firstBook = row.book[0];

        return {
            bookId: row._id.toString(),
            title: firstBook?.title || 'Unknown title',
            author: firstBook?.author || 'Unknown author',
            coverImage: firstBook?.coverImage || null,
            totalBorrowings: row.totalBorrowings,
            uniqueBorrowers: row.borrowerIds.length,
        };
    });
};

export const getLateReturnRate = async (
    requestingUser: IUser,
    query: LateReturnRateReportQuery
): Promise<LateReturnRateResult> => {
    const scope = getLibraryScope(requestingUser);
    const dateRange = resolveDateRange(query, 12);
    const now = new Date();
    const effectiveTo = dateRange.to && dateRange.to < now ? dateRange.to : now;

    const baseMatch: Record<string, unknown> = {
        status: { $in: LATE_RATE_STATUSES },
    };

    if (scope.libraryId) {
        baseMatch.libraryId = scope.libraryId;
    }

    const [totals] = await Borrowing.aggregate<{ totalConsidered: number; lateOrOverdueCount: number }>([
        { $match: baseMatch },
        {
            $addFields: {
                performanceDate: {
                    $ifNull: ['$actualReturnDate', '$dueDate'],
                },
            },
        },
        {
            $match: {
                performanceDate: {
                    ...((dateRange.from ? { $gte: dateRange.from } : {})),
                    $lte: effectiveTo,
                },
            },
        },
        {
            $group: {
                _id: null,
                totalConsidered: { $sum: 1 },
                lateOrOverdueCount: {
                    $sum: {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ['$status', BORROWING_STATUS.OVERDUE] },
                                    {
                                        $and: [
                                            { $ne: ['$actualReturnDate', null] },
                                            { $gt: ['$actualReturnDate', '$dueDate'] },
                                        ],
                                    },
                                    {
                                        $and: [
                                            { $eq: ['$actualReturnDate', null] },
                                            { $gt: [now, '$dueDate'] },
                                        ],
                                    },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const totalConsidered = totals?.totalConsidered ?? 0;
    const lateOrOverdueCount = totals?.lateOrOverdueCount ?? 0;
    const onTimeCount = Math.max(totalConsidered - lateOrOverdueCount, 0);
    const lateReturnRate = totalConsidered > 0
        ? Number(((lateOrOverdueCount / totalConsidered) * 100).toFixed(2))
        : 0;

    return {
        totalConsidered,
        lateOrOverdueCount,
        onTimeCount,
        lateReturnRate,
    };
};

export const getUserActivityReport = async (
    requestingUser: IUser,
    query: UserActivityReportQuery
): Promise<UserActivityReportResult> => {
    const scope = getLibraryScope(requestingUser);
    const dateRange = resolveDateRange(query, 12);

    const match: Record<string, unknown> = {
        status: { $in: BORROW_COUNTABLE_STATUSES },
        ...buildDateMatch('borrowDate', dateRange),
    };

    if (scope.libraryId) {
        match.libraryId = scope.libraryId;
    }

    const rows = await Borrowing.aggregate<{
        _id: Types.ObjectId;
        totalBorrowings: number;
        violationCount: number;
        user: {
            _id: Types.ObjectId;
            fullName?: string;
            email?: string;
            role?: string;
        }[];
    }>([
        { $match: match },
        {
            $group: {
                _id: '$userId',
                totalBorrowings: { $sum: 1 },
                violationCount: {
                    $sum: {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ['$status', BORROWING_STATUS.OVERDUE] },
                                    { $eq: ['$status', BORROWING_STATUS.LOST] },
                                    { $eq: ['$status', BORROWING_STATUS.DAMAGED] },
                                    {
                                        $and: [
                                            { $eq: ['$isFined', true] },
                                            { $gt: ['$fineAmount', 0] },
                                        ],
                                    },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $match: {
                'user.role': ROLES.USER,
            },
        },
    ]);

    const members: UserActivityMember[] = rows.map((row) => {
        const info = row.user[0];
        const isActive = row.totalBorrowings >= query.activityThreshold;
        const isViolator = row.violationCount > 0;

        return {
            userId: row._id.toString(),
            fullName: info?.fullName || 'Unknown user',
            email: info?.email || '',
            totalBorrowings: row.totalBorrowings,
            violationCount: row.violationCount,
            isActive,
            isViolator,
        };
    });

    const totalUsersWithBorrowings = members.length;
    const activeUsers = members.filter((member) => member.isActive).length;
    const violators = members.filter((member) => member.isViolator).length;
    const overlapCount = members.filter((member) => member.isActive && member.isViolator).length;

    const summary: UserActivitySummary = {
        totalUsersWithBorrowings,
        activeUsers,
        violators,
        activeRate: totalUsersWithBorrowings > 0
            ? Number(((activeUsers / totalUsersWithBorrowings) * 100).toFixed(2))
            : 0,
        violationRate: totalUsersWithBorrowings > 0
            ? Number(((violators / totalUsersWithBorrowings) * 100).toFixed(2))
            : 0,
        overlapCount,
        activityThreshold: query.activityThreshold,
    };

    const topActiveUsers = members
        .filter((member) => member.isActive)
        .sort((a, b) => b.totalBorrowings - a.totalBorrowings)
        .slice(0, 10);

    const topViolators = members
        .filter((member) => member.isViolator)
        .sort((a, b) => b.violationCount - a.violationCount)
        .slice(0, 10);

    return {
        summary,
        topActiveUsers,
        topViolators,
    };
};

export const getDashboardReport = async (
    requestingUser: IUser,
    query: DashboardReportQuery
): Promise<DashboardReportResult> => {
    const [fineRevenueByMonth, fineIncurredByMonth, topBorrowedBooks, lateReturnRate, userActivity] = await Promise.all([
        getFineRevenueByMonth(requestingUser, {
            from: query.from,
            to: query.to,
            months: query.months,
        }),
        getFineIncurredByMonth(requestingUser, {
            from: query.from,
            to: query.to,
            months: query.months,
        }),
        getTopBorrowedBooks(requestingUser, {
            from: query.from,
            to: query.to,
            limit: query.topLimit,
        }),
        getLateReturnRate(requestingUser, {
            from: query.from,
            to: query.to,
        }),
        getUserActivityReport(requestingUser, {
            from: query.from,
            to: query.to,
            activityThreshold: query.activityThreshold,
        }),
    ]);

    return {
        fineRevenueByMonth,
        fineIncurredByMonth,
        topBorrowedBooks,
        lateReturnRate,
        userActivity,
    };
};
