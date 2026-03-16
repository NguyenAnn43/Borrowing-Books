import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        break;
    }
}

interface Config {
    NODE_ENV: string;
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    LOG_LEVEL: string;
    CLOUDINARY: {
        cloudName?: string;
        apiKey?: string;
        apiSecret?: string;
    };
}

const config: Config = {
    // If project env is not loaded, avoid using stray global PORT values in development.
    // This prevents accidental binding to 5000 and keeps local client/server aligned.
    
    // App
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt((process.env.MONGODB_URI ? process.env.PORT : undefined) || '5001', 10),

    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/borrowing_books',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

    // Cloudinary
    CLOUDINARY: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
};

export default config;
