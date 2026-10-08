import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {

    private readonly logger = new Logger(EmailService.name);
    async sendVerificationOtp(email: string, otp: string): Promise<void> {
        // 💡 For local dev: prints directly to your terminal.
        // When you're ready for production, we can connect Resend here in 5 lines.
        this.logger.log('====================================================');
        this.logger.log(`📬 [EMAIL DISPATCH] Verification OTP for: ${email}`);
        this.logger.log(`🔑 Code: ${otp}`);
        this.logger.log(`⏳ Valid for: 10 minutes`);
        this.logger.log('====================================================');
    }
}
