import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { AppError } from '../utils';
import { AuthRequest } from '../types';

const uploadRoot = path.resolve(process.cwd(), 'uploads/avatars');
if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
}

const reviewsRoot = path.resolve(process.cwd(), 'uploads/reviews');
if (!fs.existsSync(reviewsRoot)) {
    fs.mkdirSync(reviewsRoot, { recursive: true });
}


const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadRoot);
    },
    filename: (req, file, cb) => {
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = path.extname(safeOriginal) || '.jpg';
        const baseName = path.basename(safeOriginal, extension);
        cb(null, `${req.params.id}_${Date.now()}_${baseName}${extension}`);
    },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'));
        return;
    }

    cb(null, true);
};

export const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

const reviewStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, reviewsRoot);
    },
    filename: (req, file, cb) => {
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = path.extname(safeOriginal) || '.jpg';
        const baseName = path.basename(safeOriginal, extension);
        const user = (req as AuthRequest).user;
        const prefix = user ? user._id.toString() : 'guest';
        cb(null, `review_${prefix}_${Date.now()}_${baseName}${extension}`);
    },
});

export const uploadReviewImages = multer({
    storage: reviewStorage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5, // max 5 files
    },
});
