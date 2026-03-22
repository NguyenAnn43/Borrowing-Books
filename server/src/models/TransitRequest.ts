import mongoose, { Schema, Model } from 'mongoose';
import { ITransitRequest } from '../types';
import { TRANSIT_STATUS } from '../utils/constants';

const transitRequestSchema = new Schema<ITransitRequest>(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: [true, 'Book is required'],
        },
        sourceLibraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            required: [true, 'Source library is required'],
        },
        targetLibraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            required: [true, 'Target library is required'],
        },
        targetBookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            default: null,
        },
        quantity: {
            type: Number,
            min: [1, 'Quantity must be at least 1'],
            default: 1,
            required: true,
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Requester is required'],
        },
        requestedForUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        dispatchedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        receivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(TRANSIT_STATUS),
            default: TRANSIT_STATUS.PENDING,
            required: true,
        },
        note: {
            type: String,
            default: null,
        },
        decisionNote: {
            type: String,
            default: null,
        },
        dispatchNote: {
            type: String,
            default: null,
        },
        receiveNote: {
            type: String,
            default: null,
        },
        cancelReason: {
            type: String,
            default: null,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        dispatchedAt: {
            type: Date,
            default: null,
        },
        receivedAt: {
            type: Date,
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

transitRequestSchema.index({ status: 1, createdAt: -1 });
transitRequestSchema.index({ sourceLibraryId: 1, status: 1, createdAt: -1 });
transitRequestSchema.index({ targetLibraryId: 1, status: 1, createdAt: -1 });
transitRequestSchema.index({ bookId: 1, status: 1, createdAt: -1 });

transitRequestSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, ITransitRequest>)
        .populate('bookId', 'title author isbn isbnNormalized libraryId availableCopies totalCopies coverImage')
        .populate('targetBookId', 'title author isbn isbnNormalized libraryId availableCopies totalCopies coverImage')
        .populate('sourceLibraryId', 'name code')
        .populate('targetLibraryId', 'name code')
        .populate('requestedBy', 'fullName email libraryId')
        .populate('requestedForUserId', 'fullName email')
        .populate('reviewedBy', 'fullName email')
        .populate('dispatchedBy', 'fullName email')
        .populate('receivedBy', 'fullName email')
        .populate('cancelledBy', 'fullName email');
    next();
});

const TransitRequest: Model<ITransitRequest> = mongoose.model<ITransitRequest>('TransitRequest', transitRequestSchema);

export default TransitRequest;
