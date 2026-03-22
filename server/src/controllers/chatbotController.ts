import { Request, Response, NextFunction } from 'express';
import * as chatbotService from '../services/chatbotService';
import { AppError } from '../utils';

export const chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            throw new AppError('Message is required and must be a string', 400, 'INVALID_INPUT');
        }

        const user = (req as any).user;
        const responseText = await chatbotService.processMessage(message, user?._id?.toString());

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
