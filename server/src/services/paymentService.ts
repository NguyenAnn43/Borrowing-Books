import crypto from 'crypto';
import { Types } from 'mongoose';
import querystring from 'querystring';
import { Borrowing, Payment } from '../models';
import config from '../config/env';
import { AppError, BORROWING_STATUS, formatPagination, PAGINATION } from '../utils';
import { IBorrowing, IPayment, IUser, PaginationMeta } from '../types';
import { ROLES } from '../utils/constants';
import { markFineAsPaidByBorrowingId } from './borrowingService';

interface VnpayCreateResult {
    paymentUrl: string;
    txnRef: string;
}

interface PaymentHistoryResult {
    payments: IPayment[];
    pagination: PaginationMeta;
}

const toId = (field: Types.ObjectId | { _id: Types.ObjectId } | unknown): string => {
    if (field instanceof Types.ObjectId) return field.toString();
    if (field && typeof field === 'object' && '_id' in (field as object)) {
        return (field as { _id: Types.ObjectId })._id.toString();
    }
    return String(field);
};

const sortObjectByKey = (obj: Record<string, string>): Record<string, string> => {
    const sorted: Record<string, string> = {};

    Object.keys(obj)
        .sort()
        .forEach((key) => {
            const value = obj[key];
            if (value !== undefined) {
                sorted[key] = encodeURIComponent(value).replace(/%20/g, '+');
            }
        });

    return sorted;
};

const formatDateForVnpay = (date: Date): string => {
    const yyyy = date.getFullYear().toString();
    const MM = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const HH = `${date.getHours()}`.padStart(2, '0');
    const mm = `${date.getMinutes()}`.padStart(2, '0');
    const ss = `${date.getSeconds()}`.padStart(2, '0');

    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

const buildSignedUrl = (baseUrl: string, params: Record<string, string>, secret: string): string => {
    const sorted = sortObjectByKey(params);
    const signData = querystring.stringify(sorted, '&', '=', {
        encodeURIComponent: (value: string) => value,
    });

    const secureHash = crypto
        .createHmac('sha512', secret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    const finalParams = {
        ...sorted,
        vnp_SecureHashType: 'HmacSHA512',
        vnp_SecureHash: secureHash,
    };

    return `${baseUrl}?${querystring.stringify(finalParams, '&', '=', {
        encodeURIComponent: (value: string) => value,
    })}`;
};

const buildClientRedirectUrl = (status: 'success' | 'failed', txnRef: string, message?: string): string => {
    const base = new URL('/dashboard/payments', config.CLIENT_URL);
    base.searchParams.set('status', status);
    base.searchParams.set('txnRef', txnRef);
    if (message) base.searchParams.set('message', message);

    return base.toString();
};

const ensureVnpayConfigured = () => {
    const { TMN_CODE, HASH_SECRET, URL, RETURN_URL } = config.VNPAY;

    if (!TMN_CODE || !HASH_SECRET || !URL || !RETURN_URL) {
        throw new AppError(
            'VNPay is not configured. Missing TMN_CODE / HASH_SECRET / URL / RETURN_URL',
            503,
            'VNPAY_NOT_CONFIGURED'
        );
    }
};

export const createVnpayFinePayment = async (
    user: IUser,
    borrowingId: string,
    clientIp: string
): Promise<VnpayCreateResult> => {
    ensureVnpayConfigured();

    const borrowing = await Borrowing.findById(borrowingId) as IBorrowing | null;
    if (!borrowing) {
        throw new AppError('Borrowing not found', 404, 'BORROWING_NOT_FOUND');
    }

    if (toId(borrowing.userId) !== user._id.toString()) {
        throw new AppError('You are not authorized to pay this fine', 403, 'FORBIDDEN');
    }

    if (!(
        borrowing.status === BORROWING_STATUS.OVERDUE ||
        borrowing.status === BORROWING_STATUS.RETURNED ||
        borrowing.status === BORROWING_STATUS.RETURN_TRANSIT
    )) {
        throw new AppError('Fine payment is only allowed for overdue/returned/return_transit borrowings', 400, 'INVALID_STATUS');
    }

    if (!borrowing.isFined || borrowing.fineAmount <= 0) {
        throw new AppError('This borrowing has no payable fine', 400, 'NO_FINE');
    }

    if (borrowing.finePaid) {
        throw new AppError('Fine has already been paid', 400, 'FINE_ALREADY_PAID');
    }

    const now = new Date();
    const txnRef = `${borrowing._id.toString().slice(-8)}${now.getTime()}`;
    const amount = borrowing.fineAmount;

    await Payment.create({
        userId: user._id,
        borrowingId: borrowing._id,
        provider: 'vnpay',
        status: 'pending',
        amount,
        txnRef,
    });

    const params: Record<string, string> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.VNPAY.TMN_CODE,
        vnp_Amount: `${Math.round(amount * 100)}`,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Fine payment for borrowing ${borrowing._id.toString()}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: config.VNPAY.RETURN_URL,
        vnp_IpAddr: clientIp || '127.0.0.1',
        vnp_CreateDate: formatDateForVnpay(now),
    };

    const paymentUrl = buildSignedUrl(config.VNPAY.URL, params, config.VNPAY.HASH_SECRET);

    return { paymentUrl, txnRef };
};

export const handleVnpayReturn = async (query: Record<string, string>): Promise<{ redirectUrl: string }> => {
    ensureVnpayConfigured();

    const secureHash = query.vnp_SecureHash;
    const txnRef = query.vnp_TxnRef;

    if (!secureHash || !txnRef) {
        throw new AppError('Invalid VNPay return data', 400, 'INVALID_VNPAY_RESPONSE');
    }

    const verifyPayload = { ...query };
    delete verifyPayload.vnp_SecureHash;
    delete verifyPayload.vnp_SecureHashType;

    const sorted = sortObjectByKey(verifyPayload);
    const signData = querystring.stringify(sorted, '&', '=', {
        encodeURIComponent: (value: string) => value,
    });
    const expectedHash = crypto
        .createHmac('sha512', config.VNPAY.HASH_SECRET)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    const payment = await Payment.findOne({ txnRef }) as IPayment | null;
    if (!payment) {
        return { redirectUrl: buildClientRedirectUrl('failed', txnRef, 'Không tìm thấy giao dịch thanh toán') };
    }

    if (secureHash !== expectedHash) {
        payment.status = 'failed';
        payment.vnpResponseCode = query.vnp_ResponseCode || undefined;
        payment.rawResponse = query;
        await payment.save();

        return { redirectUrl: buildClientRedirectUrl('failed', txnRef, 'Chữ ký VNPay không hợp lệ') };
    }

    if (payment.status === 'success') {
        return { redirectUrl: buildClientRedirectUrl('success', txnRef) };
    }

    const responseCode = query.vnp_ResponseCode || '';
    if (responseCode !== '00') {
        payment.status = 'failed';
        payment.vnpResponseCode = responseCode;
        payment.vnpTxnNo = query.vnp_TransactionNo || undefined;
        payment.rawResponse = query;
        await payment.save();

        return { redirectUrl: buildClientRedirectUrl('failed', txnRef, `Thanh toán thất bại (code ${responseCode})`) };
    }

    payment.status = 'success';
    payment.vnpResponseCode = responseCode;
    payment.vnpTxnNo = query.vnp_TransactionNo || undefined;
    payment.paidAt = new Date();
    payment.rawResponse = query;
    await payment.save();

    await markFineAsPaidByBorrowingId(payment.borrowingId.toString());

    return { redirectUrl: buildClientRedirectUrl('success', txnRef) };
};

export const getPaymentHistory = async (
    requestingUser: IUser,
    params: { page?: number; limit?: number; status?: 'pending' | 'success' | 'failed' } = {}
): Promise<PaymentHistoryResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status } = params;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    const query: Record<string, unknown> = {};

    if (requestingUser.role === ROLES.USER) {
        query.userId = requestingUser._id;
    }

    if (status) {
        query.status = status;
    }

    const [payments, total] = await Promise.all([
        Payment.find(query)
            .skip(skip)
            .limit(actualLimit)
            .sort({ createdAt: -1 })
            .populate('borrowingId', 'bookId dueDate fineAmount status finePaid')
            .populate({ path: 'borrowingId', populate: { path: 'bookId', select: 'title author' } })
            .populate('userId', 'fullName email') as Promise<IPayment[]>,
        Payment.countDocuments(query),
    ]);

    return {
        payments,
        pagination: formatPagination(page, actualLimit, total),
    };
};
