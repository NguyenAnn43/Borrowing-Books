import mongoose, { Types } from 'mongoose';
import { Book, Borrowing, Library, TransitRequest, User } from '../models';
import * as notificationService from './notificationService';
import {
    AppError,
    BOOK_STATUS,
    BORROWING_SETTINGS,
    BORROWING_STATUS,
    NOTIFICATION_TYPE,
    PAGINATION,
    ROLES,
    TRANSIT_STATUS,
    formatPagination,
    generateDueDate,
} from '../utils';
import { IBook, ITransitRequest, IUser, PaginationMeta } from '../types';
import {
    CancelTransitRequestInput,
    CreateTransitRequestInput,
    DispatchTransitRequestInput,
    GetTransitRequestsQuery,
    ReceiveTransitRequestInput,
    RejectTransitRequestInput,
} from '../validators/transitSchema';

interface GetTransitRequestsResult {
    requests: ITransitRequest[];
    pagination: PaginationMeta;
}

const toId = (field: unknown): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (field instanceof Types.ObjectId) return field.toString();
    if (typeof field === 'object' && '_id' in (field as object)) {
        return toId((field as { _id: unknown })._id);
    }
    if (typeof (field as { toString?: () => string }).toString === 'function') {
        return (field as { toString: () => string }).toString();
    }
    return '';
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getLibrarianLibraryId = (requestingUser: IUser): string | null => {
    if (requestingUser.role !== ROLES.LIBRARIAN) return null;
    const libraryId = toId(requestingUser.libraryId);
    if (!libraryId) {
        throw new AppError('You are not assigned to any library', 403, 'NO_LIBRARY_ASSIGNED');
    }
    return libraryId;
};

const canManageSource = (request: ITransitRequest, requestingUser: IUser, librarianLibraryId: string | null): boolean => {
    if (requestingUser.role === ROLES.ADMIN) return true;
    if (requestingUser.role === ROLES.LIBRARIAN && librarianLibraryId) {
        return toId(request.sourceLibraryId) === librarianLibraryId;
    }
    return false;
};

const canManageTarget = (request: ITransitRequest, requestingUser: IUser, librarianLibraryId: string | null): boolean => {
    if (requestingUser.role === ROLES.ADMIN) return true;
    if (requestingUser.role === ROLES.LIBRARIAN && librarianLibraryId) {
        return toId(request.targetLibraryId) === librarianLibraryId;
    }
    return false;
};

const assertTransitVisibility = (request: ITransitRequest, requestingUser: IUser, librarianLibraryId: string | null): void => {
    if (requestingUser.role === ROLES.ADMIN) return;
    if (requestingUser.role === ROLES.LIBRARIAN && librarianLibraryId) {
        const visible = toId(request.sourceLibraryId) === librarianLibraryId || toId(request.targetLibraryId) === librarianLibraryId;
        if (!visible) {
            throw new AppError('You are not authorized to view this transit request', 403, 'FORBIDDEN');
        }
        return;
    }
    throw new AppError('You are not authorized to view transit requests', 403, 'FORBIDDEN');
};

const notifyLibrariansInLibrary = async (
    libraryId: string,
    title: string,
    message: string
): Promise<void> => {
    const librarians = await User.find({
        role: ROLES.LIBRARIAN,
        status: 'active',
        libraryId: new Types.ObjectId(libraryId),
    }).select('_id') as Array<{ _id: Types.ObjectId }>;

    await Promise.all(
        librarians.map((librarian) =>
            notificationService.create({
                userId: librarian._id.toString(),
                title,
                message,
                type: NOTIFICATION_TYPE.SYSTEM,
            })
        )
    );
};

const mapById = <T extends { _id: Types.ObjectId }>(items: T[]): Set<string> => new Set(items.map((item) => item._id.toString()));

export const getTransitRequests = async (
    params: GetTransitRequestsQuery,
    requestingUser: IUser
): Promise<GetTransitRequestsResult> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const {
        q,
        status,
        direction = 'all',
        sourceLibraryId,
        targetLibraryId,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
    } = params;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    if (requestingUser.role === ROLES.ADMIN) {
        if (sourceLibraryId) query.sourceLibraryId = sourceLibraryId;
        if (targetLibraryId) query.targetLibraryId = targetLibraryId;
        if (direction === 'inbound' && targetLibraryId) query.targetLibraryId = targetLibraryId;
        if (direction === 'outbound' && sourceLibraryId) query.sourceLibraryId = sourceLibraryId;
    } else if (requestingUser.role === ROLES.LIBRARIAN && librarianLibraryId) {
        if (direction === 'inbound') {
            query.targetLibraryId = librarianLibraryId;
        } else if (direction === 'outbound') {
            query.sourceLibraryId = librarianLibraryId;
        } else {
            query.$or = [
                { sourceLibraryId: librarianLibraryId },
                { targetLibraryId: librarianLibraryId },
            ];
        }
    }

    if (q && q.trim()) {
        const keyword = q.trim();
        const safeRegex = { $regex: escapeRegex(keyword), $options: 'i' };
        const orConditions: Record<string, unknown>[] = [];

        if (Types.ObjectId.isValid(keyword)) {
            const objectId = new Types.ObjectId(keyword);
            orConditions.push({ _id: objectId });
            orConditions.push({ bookId: objectId });
            orConditions.push({ requestedForUserId: objectId });
        }

        const [matchingBooks, matchingUsers] = await Promise.all([
            Book.find({ $or: [{ title: safeRegex }, { author: safeRegex }, { isbn: safeRegex }] }).select('_id'),
            User.find({ $or: [{ fullName: safeRegex }, { email: safeRegex }] }).select('_id'),
        ]);

        const bookIds = mapById(matchingBooks as Array<{ _id: Types.ObjectId }>);
        const userIds = mapById(matchingUsers as Array<{ _id: Types.ObjectId }>);

        if (bookIds.size > 0) {
            orConditions.push({ bookId: { $in: Array.from(bookIds).map((id) => new Types.ObjectId(id)) } });
        }
        if (userIds.size > 0) {
            const ids = Array.from(userIds).map((id) => new Types.ObjectId(id));
            orConditions.push({ requestedBy: { $in: ids } });
            orConditions.push({ requestedForUserId: { $in: ids } });
        }

        if (orConditions.length === 0) {
            const actualLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);
            return { requests: [], pagination: formatPagination(page, actualLimit, 0) };
        }

        if (query.$or) {
            query.$and = [
                { $or: query.$or as Record<string, unknown>[] },
                { $or: orConditions },
            ];
            delete query.$or;
        } else {
            query.$or = orConditions;
        }
    }

    const actualLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * actualLimit;

    const [requests, total] = await Promise.all([
        TransitRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(actualLimit) as Promise<ITransitRequest[]>,
        TransitRequest.countDocuments(query),
    ]);

    return {
        requests,
        pagination: formatPagination(Math.max(1, page), actualLimit, total),
    };
};

export const getTransitRequestById = async (id: string, requestingUser: IUser): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const request = await TransitRequest.findById(id) as ITransitRequest | null;
    if (!request) {
        throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
    }

    assertTransitVisibility(request, requestingUser, librarianLibraryId);
    return request;
};

export const createTransitRequest = async (
    requestingUser: IUser,
    data: CreateTransitRequestInput
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    if (!librarianLibraryId) {
        throw new AppError('Only librarian can create transit request', 403, 'FORBIDDEN');
    }

    const sourceBook = await Book.findById(data.sourceBookId) as IBook | null;
    if (!sourceBook) {
        throw new AppError('Source book not found', 404, 'BOOK_NOT_FOUND');
    }

    const sourceLibraryId = toId(sourceBook.libraryId);
    if (sourceLibraryId === librarianLibraryId) {
        throw new AppError('Source and target library must be different', 400, 'INVALID_TRANSIT_LIBRARIES');
    }

    if (sourceBook.availableCopies < data.quantity || sourceBook.totalCopies < data.quantity) {
        throw new AppError('Source library does not have enough copies available', 400, 'INSUFFICIENT_SOURCE_COPIES');
    }

    if (data.requestedForUserId) {
        const targetUser = await User.findById(data.requestedForUserId).select('_id') as { _id: Types.ObjectId } | null;
        if (!targetUser) {
            throw new AppError('Requested user not found', 404, 'USER_NOT_FOUND');
        }
    }

    const existingOpenRequest = await TransitRequest.findOne({
        bookId: sourceBook._id,
        sourceLibraryId: sourceBook.libraryId,
        targetLibraryId: new Types.ObjectId(librarianLibraryId),
        status: { $in: [TRANSIT_STATUS.PENDING, TRANSIT_STATUS.APPROVED, TRANSIT_STATUS.IN_TRANSIT] },
    }) as ITransitRequest | null;

    if (existingOpenRequest) {
        throw new AppError('An open transit request for this book/library pair already exists', 400, 'TRANSIT_REQUEST_EXISTS');
    }

    const request = await TransitRequest.create({
        bookId: sourceBook._id,
        sourceLibraryId: sourceBook.libraryId,
        targetLibraryId: new Types.ObjectId(librarianLibraryId),
        quantity: data.quantity,
        requestedBy: requestingUser._id,
        requestedForUserId: data.requestedForUserId ? new Types.ObjectId(data.requestedForUserId) : undefined,
        note: data.note?.trim() || undefined,
        status: TRANSIT_STATUS.PENDING,
        requestedAt: new Date(),
    }) as ITransitRequest;

    const [sourceLibrary, targetLibrary] = await Promise.all([
        Library.findById(sourceLibraryId).select('name code') as Promise<{ name?: string; code?: string } | null>,
        Library.findById(librarianLibraryId).select('name code') as Promise<{ name?: string; code?: string } | null>,
    ]);

    const sourceName = sourceLibrary?.name || 'Thư viện nguồn';
    const targetName = targetLibrary?.name || 'Thư viện đích';
    const title = sourceBook.title;

    await Promise.all([
        notifyLibrariansInLibrary(
            sourceLibraryId,
            'Yêu cầu luân chuyển mới',
            `${targetName} đang yêu cầu luân chuyển "${title}" từ ${sourceName}.`
        ),
        notificationService.create({
            userId: requestingUser._id.toString(),
            title: 'Đã tạo yêu cầu luân chuyển',
            message: `Yêu cầu luân chuyển "${title}" đã được gửi tới ${sourceName}.`,
            type: NOTIFICATION_TYPE.SYSTEM,
        }),
    ]);

    const populated = await TransitRequest.findById(request._id) as ITransitRequest | null;
    if (!populated) {
        throw new AppError('Transit request created but cannot be reloaded', 500, 'TRANSIT_REQUEST_RELOAD_FAILED');
    }
    return populated;
};

export const approveTransitRequest = async (
    id: string,
    requestingUser: IUser,
    note?: string
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const request = await TransitRequest.findById(id) as ITransitRequest | null;
    if (!request) {
        throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
    }

    if (!canManageSource(request, requestingUser, librarianLibraryId)) {
        throw new AppError('You are not authorized to approve this transit request', 403, 'FORBIDDEN');
    }

    if (request.status !== TRANSIT_STATUS.PENDING) {
        throw new AppError('Only pending requests can be approved', 400, 'INVALID_TRANSIT_STATUS');
    }

    request.status = TRANSIT_STATUS.APPROVED;
    request.reviewedBy = requestingUser._id;
    request.approvedAt = new Date();
    request.rejectedAt = undefined;
    request.decisionNote = note?.trim() || undefined;
    await request.save();

    await notificationService.create({
        userId: toId(request.requestedBy),
        title: 'Yêu cầu luân chuyển đã được duyệt',
        message: `Yêu cầu luân chuyển "${(request.bookId as unknown as { title?: string }).title || 'sách'}" đã được thư viện nguồn duyệt.`,
        type: NOTIFICATION_TYPE.SYSTEM,
    });

    return request;
};

export const rejectTransitRequest = async (
    id: string,
    requestingUser: IUser,
    data: RejectTransitRequestInput
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const request = await TransitRequest.findById(id) as ITransitRequest | null;
    if (!request) {
        throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
    }

    if (!canManageSource(request, requestingUser, librarianLibraryId)) {
        throw new AppError('You are not authorized to reject this transit request', 403, 'FORBIDDEN');
    }

    if (request.status !== TRANSIT_STATUS.PENDING) {
        throw new AppError('Only pending requests can be rejected', 400, 'INVALID_TRANSIT_STATUS');
    }

    request.status = TRANSIT_STATUS.REJECTED;
    request.reviewedBy = requestingUser._id;
    request.rejectedAt = new Date();
    request.approvedAt = undefined;
    request.decisionNote = data.reason.trim();
    await request.save();

    await notificationService.create({
        userId: toId(request.requestedBy),
        title: 'Yêu cầu luân chuyển bị từ chối',
        message: `Yêu cầu bị từ chối. Lý do: ${data.reason.trim()}`,
        type: NOTIFICATION_TYPE.SYSTEM,
    });

    return request;
};

export const dispatchTransitRequest = async (
    id: string,
    requestingUser: IUser,
    data?: DispatchTransitRequestInput
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const request = await TransitRequest.findById(id).session(session) as ITransitRequest | null;
        if (!request) {
            throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
        }

        if (!canManageSource(request, requestingUser, librarianLibraryId)) {
            throw new AppError('You are not authorized to dispatch this transit request', 403, 'FORBIDDEN');
        }

        if (request.status !== TRANSIT_STATUS.APPROVED) {
            throw new AppError('Only approved requests can be dispatched', 400, 'INVALID_TRANSIT_STATUS');
        }

        const quantity = request.quantity;
        const sourceBook = await Book.findOneAndUpdate(
            {
                _id: request.bookId,
                libraryId: request.sourceLibraryId,
                availableCopies: { $gte: quantity },
                totalCopies: { $gte: quantity },
            },
            [
                {
                    $set: {
                        availableCopies: { $subtract: ['$availableCopies', quantity] },
                        totalCopies: { $subtract: ['$totalCopies', quantity] },
                    },
                },
                {
                    $set: {
                        status: {
                            $cond: [
                                { $lte: [{ $subtract: ['$availableCopies', quantity] }, 0] },
                                BOOK_STATUS.UNAVAILABLE,
                                BOOK_STATUS.AVAILABLE,
                            ],
                        },
                    },
                },
            ],
            { new: true, session }
        ) as IBook | null;

        if (!sourceBook) {
            throw new AppError('Source library has insufficient copies to dispatch', 400, 'INSUFFICIENT_SOURCE_COPIES');
        }

        request.status = TRANSIT_STATUS.IN_TRANSIT;
        request.dispatchedBy = requestingUser._id;
        request.dispatchedAt = new Date();
        request.dispatchNote = data?.note?.trim() || undefined;
        await request.save({ session });

        await session.commitTransaction();

        await notificationService.create({
            userId: toId(request.requestedBy),
            title: 'Sách đang được luân chuyển',
            message: `Yêu cầu luân chuyển đã được xuất kho và đang trên đường tới thư viện đích.`,
            type: NOTIFICATION_TYPE.SYSTEM,
        });

        const populated = await TransitRequest.findById(request._id) as ITransitRequest | null;
        if (!populated) {
            throw new AppError('Transit request cannot be reloaded', 500, 'TRANSIT_REQUEST_RELOAD_FAILED');
        }
        return populated;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const receiveTransitRequest = async (
    id: string,
    requestingUser: IUser,
    data?: ReceiveTransitRequestInput
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdAutoBorrowing = false;
    let autoBorrowingUserId: string | null = null;

    try {
        const request = await TransitRequest.findById(id).session(session) as ITransitRequest | null;
        if (!request) {
            throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
        }

        if (!canManageTarget(request, requestingUser, librarianLibraryId)) {
            throw new AppError('You are not authorized to receive this transit request', 403, 'FORBIDDEN');
        }

        if (request.status !== TRANSIT_STATUS.IN_TRANSIT) {
            throw new AppError('Only in-transit requests can be received', 400, 'INVALID_TRANSIT_STATUS');
        }

        const sourceBook = await Book.findById(request.bookId).session(session) as IBook | null;
        if (!sourceBook) {
            throw new AppError('Source book not found', 404, 'BOOK_NOT_FOUND');
        }

        const targetQuery: Record<string, unknown> = { libraryId: request.targetLibraryId };
        if (sourceBook.isbnNormalized) {
            targetQuery.isbnNormalized = sourceBook.isbnNormalized;
        } else {
            targetQuery.title = sourceBook.title;
            targetQuery.author = sourceBook.author;
        }

        let targetBook = await Book.findOne(targetQuery).session(session) as IBook | null;
        const quantity = request.quantity;

        if (targetBook) {
            targetBook = await Book.findByIdAndUpdate(
                targetBook._id,
                [
                    {
                        $set: {
                            availableCopies: { $add: ['$availableCopies', quantity] },
                            totalCopies: { $add: ['$totalCopies', quantity] },
                            status: BOOK_STATUS.AVAILABLE,
                        },
                    },
                ],
                { new: true, session }
            ) as IBook | null;
        } else {
            const created = await Book.create([{
                isbn: sourceBook.isbn,
                title: sourceBook.title,
                author: sourceBook.author,
                publisher: sourceBook.publisher,
                publishYear: sourceBook.publishYear,
                category: sourceBook.category,
                description: sourceBook.description,
                price: sourceBook.price || 0,
                coverImage: sourceBook.coverImage,
                language: sourceBook.language,
                pageCount: sourceBook.pageCount,
                tags: sourceBook.tags || [],
                libraryId: request.targetLibraryId,
                totalCopies: quantity,
                availableCopies: quantity,
                status: BOOK_STATUS.AVAILABLE,
            }], { session }) as IBook[];
            targetBook = created[0] || null;
        }

        if (!targetBook) {
            throw new AppError('Cannot create or update target book inventory', 500, 'TARGET_BOOK_UPSERT_FAILED');
        }

        request.status = TRANSIT_STATUS.COMPLETED;
        request.receivedBy = requestingUser._id;
        request.receivedAt = new Date();
        request.receiveNote = data?.note?.trim() || undefined;
        request.targetBookId = targetBook._id;

        if (request.requestedForUserId) {
            const existingActiveBorrowing = await Borrowing.findOne({
                userId: request.requestedForUserId,
                bookId: targetBook._id,
                status: { $in: [BORROWING_STATUS.PENDING, BORROWING_STATUS.BORROWED] },
            }).session(session) as { _id: Types.ObjectId } | null;

            if (!existingActiveBorrowing) {
                const now = new Date();
                const dueDate = generateDueDate(now, BORROWING_SETTINGS.DEFAULT_BORROW_DAYS);
                await Borrowing.create([{
                    userId: request.requestedForUserId,
                    bookId: targetBook._id,
                    libraryId: request.targetLibraryId,
                    borrowDate: now,
                    dueDate,
                    status: BORROWING_STATUS.PENDING,
                    notes: `Auto-created from transit request ${request._id.toString()}`,
                }], { session });
                createdAutoBorrowing = true;
                autoBorrowingUserId = toId(request.requestedForUserId);
            }
        }

        await request.save({ session });

        await session.commitTransaction();

        await notificationService.create({
            userId: toId(request.requestedBy),
            title: 'Hoàn tất luân chuyển sách',
            message: 'Thư viện đích đã nhận sách và nhập kho thành công.',
            type: NOTIFICATION_TYPE.SYSTEM,
        });

        if (createdAutoBorrowing && autoBorrowingUserId) {
            await notificationService.create({
                userId: autoBorrowingUserId,
                title: 'Sách đã về thư viện đích',
                message: 'Sách bạn đang chờ đã được luân chuyển thành công. Thư viện sẽ xác nhận để bạn đến nhận sách.',
                type: NOTIFICATION_TYPE.BORROWING,
            });
        }

        const populated = await TransitRequest.findById(request._id) as ITransitRequest | null;
        if (!populated) {
            throw new AppError('Transit request cannot be reloaded', 500, 'TRANSIT_REQUEST_RELOAD_FAILED');
        }
        return populated;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const cancelTransitRequest = async (
    id: string,
    requestingUser: IUser,
    data?: CancelTransitRequestInput
): Promise<ITransitRequest> => {
    const librarianLibraryId = getLibrarianLibraryId(requestingUser);
    const request = await TransitRequest.findById(id) as ITransitRequest | null;
    if (!request) {
        throw new AppError('Transit request not found', 404, 'TRANSIT_REQUEST_NOT_FOUND');
    }

    if (request.status !== TRANSIT_STATUS.PENDING && request.status !== TRANSIT_STATUS.APPROVED) {
        throw new AppError('Only pending/approved requests can be cancelled', 400, 'INVALID_TRANSIT_STATUS');
    }

    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isRequester = toId(request.requestedBy) === toId(requestingUser._id);
    const isTargetLibrarian = requestingUser.role === ROLES.LIBRARIAN
        && librarianLibraryId
        && toId(request.targetLibraryId) === librarianLibraryId;

    if (!isAdmin && !isRequester && !isTargetLibrarian) {
        throw new AppError('You are not authorized to cancel this transit request', 403, 'FORBIDDEN');
    }

    request.status = TRANSIT_STATUS.CANCELLED;
    request.cancelledBy = requestingUser._id;
    request.cancelledAt = new Date();
    request.cancelReason = data?.reason?.trim() || undefined;
    await request.save();

    await notificationService.create({
        userId: toId(request.requestedBy),
        title: 'Yêu cầu luân chuyển đã bị hủy',
        message: data?.reason?.trim()
            ? `Yêu cầu đã hủy. Lý do: ${data.reason.trim()}`
            : 'Yêu cầu luân chuyển đã được hủy.',
        type: NOTIFICATION_TYPE.SYSTEM,
    });

    return request;
};
