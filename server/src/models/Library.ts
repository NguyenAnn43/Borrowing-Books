import mongoose, { Schema, Model } from 'mongoose';
import { ILibrary } from '../types';
import { LIBRARY_STATUS } from '../utils/constants';

const librarySchema = new Schema<ILibrary>(
    {
        name: {
            type: String,
            required: [true, 'Library name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Library code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        address: {
            type: String,
            required: [true, 'Address is required'],
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(LIBRARY_STATUS),
            default: LIBRARY_STATUS.ACTIVE,
        },
        workingHours: {
            open: {
                type: String,
                default: '08:00',
            },
            close: {
                type: String,
                default: '17:00',
            },
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for faster queries
librarySchema.index({ status: 1 });

// Virtual for book count
librarySchema.virtual('bookCount', {
    ref: 'Book',
    localField: '_id',
    foreignField: 'libraryId',
    count: true,
});

const Library: Model<ILibrary> = mongoose.model<ILibrary>('Library', librarySchema);

export default Library;
