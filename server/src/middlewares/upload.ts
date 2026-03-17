import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { AppError } from '../utils';

const uploadRoot = path.resolve(process.cwd(), 'uploads/avatars');
if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
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
