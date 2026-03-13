import mongoose, { Schema, Model } from 'mongoose';
import { IReservation } from '../types';
import { RESERVATION_STATUS, RESERVATION_SETTINGS } from '../utils/constants';

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
        /**
         * Not set at creation time.
         * Only set (or reset) when the reservation transitions to READY.
         * This prevents expiry before the librarian has a chance to action it.
         */
        expiryDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(RESERVATION_STATUS),
            default: RESERVATION_STATUS.PENDING,
        },
        /**
         * Populated when the reservation is fulfilled.
         * Enables end-to-end traceability: Reservation → Borrowing.
         */
        borrowingId: {
            type: Schema.Types.ObjectId,
            ref: 'Borrowing',
            default: null,
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

// Check if READY reservation is expired (only meaningful when status=READY)
reservationSchema.methods.checkExpiry = function (): void {
    if (this.status !== RESERVATION_STATUS.READY) return;
    if (!this.expiryDate) return;
    if (new Date() > this.expiryDate) {
        this.status = RESERVATION_STATUS.EXPIRED;
    }
};

// Unused but kept for reference
void RESERVATION_SETTINGS;

const Reservation: Model<IReservation> = mongoose.model<IReservation>('Reservation', reservationSchema);

export default Reservation;
