import { Response, NextFunction } from 'express';
import * as chatbotService from '../services/chatbotService';
import { AppError } from '../utils';
import { AuthRequest } from '../types';

export const chat = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            throw new AppError('Message is required and must be a string', 400, 'INVALID_INPUT');
        }

        const responseText = await chatbotService.processMessage(message, req.user?._id?.toString());

        res.status(200).json({
            success: true,
            data: {
                response: responseText
            }
        });
    } catch (error) {
        next(error);
    }
};
