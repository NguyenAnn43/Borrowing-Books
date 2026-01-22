import mongoose from 'mongoose';
import config from './env';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(config.MONGODB_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        const err = error as Error;
        logger.error(`MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err}`);
});

export default connectDB;
