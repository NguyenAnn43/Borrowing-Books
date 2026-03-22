import nodemailer from 'nodemailer';
import config from '../config/env';
import logger from '../utils/logger';

const isConfigured = Boolean(config.EMAIL.host && config.EMAIL.user && config.EMAIL.pass);

const transport = isConfigured
    ? nodemailer.createTransport({
        host: config.EMAIL.host,
        port: config.EMAIL.port,
        secure: config.EMAIL.secure,
        auth: {
            user: config.EMAIL.user,
            pass: config.EMAIL.pass,
        },
    })
    : null;

export interface SendEmailInput {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export const canSendEmail = (): boolean => Boolean(transport);

export const sendEmail = async (input: SendEmailInput): Promise<void> => {
    if (!transport) {
        logger.warn(`[MAIL] SMTP not configured. Skip sending email to ${input.to}`);
        return;
    }

    await transport.sendMail({
        from: config.EMAIL.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
    });
};
