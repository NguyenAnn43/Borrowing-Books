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
    EMAIL: {
        host?: string;
        port: number;
        secure: boolean;
        user?: string;
        pass?: string;
        from: string;
    };
    SCHEDULER: {
        dueSoonReminderCron: string;
        dueSoonReminderDays: number;
        dueSoonAllowRepeatInSameDay: boolean;
        overdueFineReminderCron: string;
    };
    CLIENT_URL: string;
    VNPAY: {
        TMN_CODE: string;
        HASH_SECRET: string;
        URL: string;
        RETURN_URL: string;
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

    EMAIL: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'no-reply@borrowingbooks.local',
    },

    SCHEDULER: {
        dueSoonReminderCron: process.env.DUE_SOON_REMINDER_CRON || '0 8 * * *',
        dueSoonReminderDays: parseInt(process.env.DUE_SOON_REMINDER_DAYS || '2', 10),
        dueSoonAllowRepeatInSameDay: process.env.DUE_SOON_REMINDER_ALLOW_REPEAT_IN_DAY === 'true',
        overdueFineReminderCron: process.env.OVERDUE_FINE_REMINDER_CRON || '0 8 * * *',
    },

    CLIENT_URL: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3000',

    VNPAY: {
        TMN_CODE: process.env.VNPAY_TMN_CODE || '',
        HASH_SECRET: process.env.VNPAY_HASH_SECRET || '',
        URL: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        RETURN_URL: process.env.VNPAY_RETURN_URL || 'http://localhost:5001/api/payments/vnpay/return',
    },
};

export default config;
