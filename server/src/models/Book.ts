import mongoose, { Schema, Model } from 'mongoose';
import { IBook } from '../types';
import { BOOK_STATUS } from '../utils/constants';

const bookSchema = new Schema<IBook>(
    {
        isbn: {
            type: String,
            trim: true,
        },
        title: {
            type: String,
            required: [true, 'Book title is required'],
            trim: true,
        },
        author: {
            type: String,
            required: [true, 'Author is required'],
            trim: true,
        },
        publisher: {
            type: String,
            trim: true,
        },
        publishYear: {
            type: Number,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        description: {
            type: String,
        },
        coverImage: {
            type: String,
            default: null,
        },
        language: {
            type: String,
            default: 'vi',
        },
        pageCount: {
            type: Number,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        location: {
            type: String,
            trim: true,
        },
        libraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            required: [true, 'Library is required'],
        },
        totalCopies: {
            type: Number,
            required: [true, 'Total copies is required'],
            min: [0, 'Total copies cannot be negative'],
        },
        availableCopies: {
            type: Number,
            required: [true, 'Available copies is required'],
            min: [0, 'Available copies cannot be negative'],
        },
        status: {
            type: String,
            enum: Object.values(BOOK_STATUS),
            default: BOOK_STATUS.AVAILABLE,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for faster queries
bookSchema.index({ title: 'text', author: 'text', tags: 'text' });
bookSchema.index({ libraryId: 1, status: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ isbn: 1 });

// Validate availableCopies <= totalCopies
bookSchema.pre('save', function (next) {
    if (this.availableCopies > this.totalCopies) {
        this.availableCopies = this.totalCopies;
    }
    next();
});

// Update status based on availability
bookSchema.pre('save', function (next) {
    if (this.availableCopies === 0) {
        this.status = BOOK_STATUS.UNAVAILABLE;
    } else {
        this.status = BOOK_STATUS.AVAILABLE;
    }
    next();
});

const Book: Model<IBook> = mongoose.model<IBook>('Book', bookSchema);

export default Book;
