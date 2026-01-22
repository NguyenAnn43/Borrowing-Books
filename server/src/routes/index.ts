import { Router, IRouter, Request, Response } from 'express';

import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import libraryRoutes from './libraryRoutes';
import bookRoutes from './bookRoutes';
import borrowingRoutes from './borrowingRoutes';

const router: IRouter = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/libraries', libraryRoutes);
router.use('/books', bookRoutes);
router.use('/borrowings', borrowingRoutes);

// Health check
router.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
