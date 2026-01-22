import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';
import { ROLES, USER_STATUS, BORROWING_SETTINGS } from '../utils/constants';

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.USER,
        },
        libraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.ACTIVE,
        },
        maxBorrowLimit: {
            type: Number,
            default: BORROWING_SETTINGS.MAX_BORROW_LIMIT,
        },
        refreshToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for faster queries
userSchema.index({ role: 1, status: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive fields
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.refreshToken;
    return user;
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
