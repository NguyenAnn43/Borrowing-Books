/**
 * Custom application error class
 */
export class AppError extends Error {
    public statusCode: number;
    public code: string;
    public status: string;
    public isOperational: boolean;
    public details?: unknown;

    constructor(message: string, statusCode: number, code: string = 'ERROR', details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
