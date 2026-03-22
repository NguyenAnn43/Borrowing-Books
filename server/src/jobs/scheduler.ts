import cron from 'node-cron';
import config from '../config/env';
import { checkAndMarkOverdue, sendDueSoonReminders, sendOverdueFineReminders } from '../services/borrowingService';
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

    // Job 4: Send due-soon reminders (default: 2 days before due date)
    cron.schedule(config.SCHEDULER.dueSoonReminderCron, async () => {
        logger.info('[Scheduler] Running due soon reminders...');
        try {
            const count = await sendDueSoonReminders(config.SCHEDULER.dueSoonReminderDays);
            logger.info(`[Scheduler] Sent ${count} due-soon reminder(s)`);
        } catch (err) {
            logger.error('[Scheduler] due soon reminders failed', err);
        }
    });

    // Job 5: Send overdue-fine reminders — runs daily at 08:00
    cron.schedule(config.SCHEDULER.overdueFineReminderCron, async () => {
        logger.info('[Scheduler] Running overdue fine reminders...');
        try {
            const count = await sendOverdueFineReminders();
            logger.info(`[Scheduler] Sent ${count} overdue-fine reminder(s)`);
        } catch (err) {
            logger.error('[Scheduler] overdue fine reminders failed', err);
        }
    });

    logger.info(`[Scheduler] due-soon reminder cron: ${config.SCHEDULER.dueSoonReminderCron} (daysBeforeDue=${config.SCHEDULER.dueSoonReminderDays})`);
    logger.info('[Scheduler] All cron jobs registered');
};
