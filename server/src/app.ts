import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';

import config from './config/env';
import connectDB from './config/database';
import swaggerSpec from './config/swagger';
import { logger } from './utils';
import routes from './routes';
import { errorHandler, notFound } from './middlewares';

// Initialize Express app
const app: Application = express();

// Connect to MongoDB
connectDB();

// Security middlewares
app.use(helmet());
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
        },
    },
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Logging
if (config.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) },
    }));
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Borrowing Books API',
}));

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Welcome to Borrowing Books API',
        docs: '/api-docs',
        health: '/api/health',
    });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
    logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    process.exit(1);
});

export default app;
