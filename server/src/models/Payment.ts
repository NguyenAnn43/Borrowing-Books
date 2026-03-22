import mongoose, { Schema, Model } from 'mongoose';
import { IPayment } from '../types';

const paymentSchema = new Schema<IPayment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        borrowingId: {
            type: Schema.Types.ObjectId,
            ref: 'Borrowing',
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ['vnpay', 'cash'],
            default: 'vnpay',
        },
        paidLibraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending',
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        txnRef: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        vnpTxnNo: {
            type: String,
            default: null,
        },
        vnpResponseCode: {
            type: String,
            default: null,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        rawResponse: {
            type: Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ borrowingId: 1, createdAt: -1 });
paymentSchema.index({ paidLibraryId: 1, paidAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
