import cron from 'node-cron';
import { checkAndMarkOverdue, autoCancelExpiredPending } from '../services/borrowingService';
import { expireReservations } from '../services/reservationService';
import { cleanupOld as cleanupOldNotifications } from '../services/notificationService';
import logger from '../utils/logger';

/**
 * Start all cron jobs.
 * Call this only in production/development environments; do NOT call in tests.
 *
 * Guard in app.ts:
 *   if (process.env.NODE_ENV !== 'test') startScheduler();
 */
export const startScheduler = (): void => {
    // Job 1: Mark overdue borrowings — runs daily at 00:01
    cron.schedule('1 0 * * *', async () => {
        logger.info('[Scheduler] Running checkAndMarkOverdue...');
        try {
            const count = await checkAndMarkOverdue();
            logger.info(`[Scheduler] Marked ${count} borrowing(s) as overdue`);
        } catch (err) {
            logger.error('[Scheduler] checkAndMarkOverdue failed', err);
        }
    });

    // Job 2: Expire READY reservations past expiryDate — runs every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('[Scheduler] Running expireReservations...');
        try {
            const count = await expireReservations();
            logger.info(`[Scheduler] Expired ${count} reservation(s)`);
        } catch (err) {
            logger.error('[Scheduler] expireReservations failed', err);
        }
    });

    // Job 3: Cleanup old read notifications (>30 days) — runs daily at 00:10
    cron.schedule('10 0 * * *', async () => {
        logger.info('[Scheduler] Running notification cleanup...');
        try {
            const count = await cleanupOldNotifications(30);
            logger.info(`[Scheduler] Deleted ${count} old notification(s)`);
        } catch (err) {
            logger.error('[Scheduler] notification cleanup failed', err);
        }
    });

    // Job 4: Auto-cancel expired pending borrowings (>24h unpicked) — runs every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        logger.info('[Scheduler] Running autoCancelExpiredPending at', new Date());
        try {
            const count = await autoCancelExpiredPending();
            logger.info(`[Scheduler] Auto-cancelled ${count} expired pending borrowing(s)`);
            if (count === 0) {
                logger.info('[Scheduler] No expired pending borrowings found');
            }
        } catch (err) {
            logger.error('[Scheduler] autoCancelExpiredPending failed', err);
        }
    });

    logger.info('[Scheduler] All cron jobs registered', new Date());
};
