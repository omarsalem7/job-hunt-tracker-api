import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {

    private readonly logger = new Logger(EmailService.name);
    private readonly transporter: Transporter | null = null;
    private readonly fromEmail: string;


    constructor(private readonly configService: ConfigService) {
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        this.fromEmail = this.configService.get<string>('EMAIL_FROM') || (user ? `Job Hunt Tracker <${user}>` : 'noreply@jobhunttracker.com');
        if (user && pass) {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user,
                    pass,
                },
            });
            this.logger.log('📧 Nodemailer Gmail transporter initialized successfully.');
        } else {
            this.logger.warn('⚠️ SMTP_USER or SMTP_PASS is not set. Falling back to console logging.');
        }
    }



    async sendVerificationOtp(email: string, otp: string): Promise<void> {
        if (!this.transporter) {
            this.logConsoleOtp('Verification', email, otp);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.fromEmail,
                to: email,
                subject: 'Verify your email - Job Hunt Tracker',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1e293b; margin-bottom: 8px;">Verify Your Email</h2>
                        <p style="color: #64748b; font-size: 15px;">Welcome to Job Hunt Tracker! Use the code below to verify your account:</p>
                        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
                            <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otp}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">This code will expire in 10 minutes. If you did not create an account, you can ignore this email.</p>
                    </div>
                `,
            });
            this.logger.log(`✉️ Verification email sent to ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to send verification email to ${email}: ${error.message}`);
        }
    }
    async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
        if (!this.transporter) {
            this.logConsoleOtp('Password Reset', email, otp);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.fromEmail,
                to: email,
                subject: 'Reset your password - Job Hunt Tracker',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1e293b; margin-bottom: 8px;">Reset Your Password</h2>
                        <p style="color: #64748b; font-size: 15px;">We received a request to reset your password. Use the code below to continue:</p>
                        <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
                            <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #dc2626;">${otp}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">This code will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                `,
            });
            this.logger.log(`✉️ Password reset email sent to ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
        }
    }

    private logConsoleOtp(type: string, email: string, otp: string): void {
        this.logger.log('====================================================');
        this.logger.log(`📬 [EMAIL DISPATCH] ${type} OTP for: ${email}`);
        this.logger.log(`🔑 Code: ${otp}`);
        this.logger.log(`⏳ Valid for: 10 minutes`);
        this.logger.log('====================================================');
    }
}
