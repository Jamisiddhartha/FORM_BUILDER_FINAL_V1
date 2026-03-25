import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Initialize transporter with environment variables
        // For now, we'll use a placeholder or look for env vars
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendVerificationEmail(to: string, token: string) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

        await this.transporter.sendMail({
            from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
            to,
            subject: 'Verify your email address',
            html: `
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${url}">Verify Email</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
        });
    }

    async sendPasswordResetEmail(to: string, token: string) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        await this.transporter.sendMail({
            from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
            to,
            subject: 'Reset your password',
            html: `
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p><a href="${url}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `,
        });
    }
}
