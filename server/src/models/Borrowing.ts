import mongoose, { Schema, Model } from 'mongoose';
import { IBorrowing } from '../types';
import { BORROWING_STATUS, BORROWING_SETTINGS } from '../utils/constants';
import { calculateOverdueDays, calculateFine } from '../utils/helpers';

const borrowingSchema = new Schema<IBorrowing>(
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
        borrowDate: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        returnDate: {
            type: Date,
            default: null,
        },
        actualReturnDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(BORROWING_STATUS),
            default: BORROWING_STATUS.PENDING,
        },
        fineAmount: {
            type: Number,
            default: 0,
        },
        isFined: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for faster queries
borrowingSchema.index({ userId: 1, status: 1 });
borrowingSchema.index({ libraryId: 1, status: 1 });
borrowingSchema.index({ dueDate: 1, status: 1 });

// Auto-populate references
borrowingSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, IBorrowing>)
        .populate('userId', 'fullName email')
        .populate('bookId', 'title author coverImage')
        .populate('libraryId', 'name code');
    next();
});

// Calculate overdue and fine
borrowingSchema.methods.checkOverdue = function (): void {
    if (this.status !== BORROWING_STATUS.BORROWED) return;

    const overdueDays = calculateOverdueDays(this.dueDate);

    if (overdueDays > 0) {
        this.status = BORROWING_STATUS.OVERDUE;
        this.fineAmount = calculateFine(overdueDays, BORROWING_SETTINGS.OVERDUE_FINE_PER_DAY);
        this.isFined = true;
    }
};

// Virtual for overdue days
borrowingSchema.virtual('overdueDays').get(function () {
    if (this.status !== BORROWING_STATUS.OVERDUE && this.status !== BORROWING_STATUS.BORROWED) {
        return 0;
    }
    return calculateOverdueDays(this.dueDate);
});

const Borrowing: Model<IBorrowing> = mongoose.model<IBorrowing>('Borrowing', borrowingSchema);

export default Borrowing;
