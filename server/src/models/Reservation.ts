import mongoose, { Schema, Model } from 'mongoose';
import { IReservation } from '../types';
import { RESERVATION_STATUS } from '../utils/constants';

const reservationSchema = new Schema<IReservation>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        bookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: [true, 'Book is required'],
        },
        libraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            required: [true, 'Library is required'],
        },
        reservationDate: {
            type: Date,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
            required: [true, 'Expiry date is required'],
        },
        status: {
            type: String,
            enum: Object.values(RESERVATION_STATUS),
            default: RESERVATION_STATUS.PENDING,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for faster queries
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ bookId: 1, status: 1 });
reservationSchema.index({ expiryDate: 1, status: 1 });

// Auto-populate references
reservationSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, IReservation>)
        .populate('userId', 'fullName email')
        .populate('bookId', 'title author coverImage')
        .populate('libraryId', 'name code');
    next();
});

// Check if reservation is expired
reservationSchema.methods.checkExpiry = function (): void {
    if (this.status !== RESERVATION_STATUS.PENDING && this.status !== RESERVATION_STATUS.READY) {
        return;
    }

    if (new Date() > this.expiryDate) {
        this.status = RESERVATION_STATUS.EXPIRED;
    }
};

const Reservation: Model<IReservation> = mongoose.model<IReservation>('Reservation', reservationSchema);

export default Reservation;
