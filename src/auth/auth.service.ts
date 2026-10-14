import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import crypto from 'node:crypto';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { OtpType } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) { }

    async register(registerDto: RegisterDto) {
        const normalizedEmail = registerDto.email.trim().toLowerCase();

        // 1. Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // 2. If user exists AND is already verified -> Block them!
        if (existingUser && existingUser.isEmailVerified) {
            throw new ConflictException('Email is already taken');
        }

        const passwordHash = await bcrypt.hash(registerDto.password, 12);

        let user;

        if (existingUser && !existingUser.isEmailVerified) {
            // 3. User exists but NEVER verified -> Update password & reuse account!
            user = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: { passwordHash },
                select: { id: true, email: true, createdAt: true, updatedAt: true },
            });
        } else {
            // 4. Brand new user -> Create them!
            user = await this.prisma.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                },
                select: { id: true, email: true, createdAt: true, updatedAt: true },
            });
        }

        // 5. Send fresh OTP
        await this.createAndSendOtp(user.email);

        return {
            user,
            message: 'Registration successful! Please check your email for the verification code.',
        };
    }


    async login(loginDto: LoginDto) {
        const user = await this.validateUserCredentials(loginDto);
        const accessToken = await this.generateToken(user.id, user.email);

        return {
            message: "Login successful",
            user,
            accessToken,
        }

    }

    async validateUserCredentials(loginDto: LoginDto) {
        const normalizedEmail = loginDto.email.trim().toLowerCase();
        // 1. Look up user by email
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        // 2. If user doesn't exist, throw 401 Unauthorized
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        // 3. Compare plaintext password with stored bcrypt hash
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        // 4. If password doesn't match, throw the SAME 401 error
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.isEmailVerified) {
            throw new ForbiddenException('Please verify your email before logging in.');
        }
        // 5. Exclude passwordHash from returned object
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async resendOtp(resendOtpDto: ResendOtpDto) {
        const { email } = resendOtpDto;
        // 1. Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user) {
            throw new NotFoundException('User not found with this email');
        }

        // 2. Check if already verified
        if (user.isEmailVerified) {
            throw new BadRequestException('Email is already verified. Please log in.');
        }

        // 3. 🛡️ The 60-Second Cooldown (Prevent Spam)
        const lastOtp = await this.prisma.emailVerificationOtp.findFirst({
            where: {
                email,
                type: OtpType.EMAIL_VERIFICATION
            },
            orderBy: { createdAt: 'desc' },
        });
        if (lastOtp) {
            const timeElapsed = Date.now() - lastOtp.createdAt.getTime();
            const cooldown = 60 * 1000; // 60 seconds in milliseconds
            if (timeElapsed < cooldown) {
                const secondsLeft = Math.ceil((cooldown - timeElapsed) / 1000);
                throw new BadRequestException(`Please wait ${secondsLeft} seconds before requesting a new code.`);
            }
        }

        // 4. Send the new code!
        await this.createAndSendOtp(email);
        return {
            message: 'A new verification code has been sent to your email.',
        };


    }




    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        const otpRecord = await this.prisma.emailVerificationOtp.findFirst({
            where: {
                email: verifyEmailDto.email,
                type: OtpType.EMAIL_VERIFICATION
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!otpRecord) {
            throw new BadRequestException('No verification code found. Please request a new one.');
        }
        if (otpRecord.expiresAt < new Date()) {
            throw new BadRequestException('Verification code has expired. Please request a new one.')
        }
        if (otpRecord.attempts >= 5) {
            throw new BadRequestException('Too many failed attempts. Please request a new code.');
        }

        const isCodeValid = await bcrypt.compare(verifyEmailDto.code, otpRecord.otpHash);
        if (!isCodeValid) {
            await this.prisma.emailVerificationOtp.update({
                where: { id: otpRecord.id },
                data: {
                    attempts: otpRecord.attempts + 1
                }
            })
            throw new BadRequestException('Invalid verification code');
        }
        const user = await this.prisma.user.update({
            where: {
                email: verifyEmailDto.email
            },
            data: {
                isEmailVerified: true
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        await this.prisma.emailVerificationOtp.deleteMany({
            where: {
                email: verifyEmailDto.email,
                type: OtpType.EMAIL_VERIFICATION
            }
        });
        const accessToken = await this.generateToken(user.id, user.email);
        return {
            message: "Email verified successfully",
            user,
            accessToken,
        }

    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: forgotPasswordDto.email
            }
        })
        if (!user) {
            return {
                message: 'If an account exists with this email, a reset code has been sent.',
                expiresAt: '10 mins',
            };
        }

        // 🛡️ The 60-Second Cooldown (Prevent Spam)
        const lastOtp = await this.prisma.emailVerificationOtp.findFirst({
            where: {
                email: user.email,
                type: OtpType.PASSWORD_RESET,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (lastOtp) {
            const timeElapsed = Date.now() - lastOtp.createdAt.getTime();
            const cooldown = 60 * 1000; // 60 seconds
            if (timeElapsed < cooldown) {
                const secondsLeft = Math.ceil((cooldown - timeElapsed) / 1000);
                throw new BadRequestException(`Please wait ${secondsLeft} seconds before requesting a new code.`);
            }
        }

        await this.createAndSendOtp(user.email, OtpType.PASSWORD_RESET);
        return {
            message: 'If an account exists with this email, a reset code has been sent.',
            expiresAt: '10 mins',
        };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const otpRecord = await this.prisma.emailVerificationOtp.findFirst({
            where: {
                email: resetPasswordDto.email,
                type: OtpType.PASSWORD_RESET
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!otpRecord) {
            throw new BadRequestException('No verification code found. Please request a new one.');
        }
        if (otpRecord.expiresAt < new Date()) {
            throw new BadRequestException('Verification code has expired. Please request a new one.')
        }
        if (otpRecord.attempts >= 5) {
            throw new BadRequestException('Too many failed attempts. Please request a new one.');
        }

        const isCodeValid = await bcrypt.compare(resetPasswordDto.code, otpRecord.otpHash);
        if (!isCodeValid) {
            await this.prisma.emailVerificationOtp.update({
                where: { id: otpRecord.id },
                data: {
                    attempts: otpRecord.attempts + 1
                }
            })
            throw new BadRequestException('Invalid verification code');
        }
        const user = await this.prisma.user.update({
            where: {
                email: resetPasswordDto.email
            },
            data: {
                passwordHash: await bcrypt.hash(resetPasswordDto.password, 10),
                isEmailVerified: true,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        await this.prisma.emailVerificationOtp.deleteMany({
            where: {
                email: resetPasswordDto.email,
                type: OtpType.PASSWORD_RESET
            }
        });
        return {
            message: "Password reset successfully",
            user,
        }
    }

    private async createAndSendOtp(email: string, type: OtpType = OtpType.EMAIL_VERIFICATION) {
        await this.prisma.emailVerificationOtp.deleteMany({
            where: {
                email,
                type
            }
        });
        const otp = crypto.randomInt(100000, 1000000).toString();
        const hashOtp = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.emailVerificationOtp.create({
            data: {
                email,
                otpHash: hashOtp,
                expiresAt,
                attempts: 0,
                type
            },
        });
        if (type === OtpType.PASSWORD_RESET) {
            await this.emailService.sendPasswordResetOtp(email, otp);
        } else {
            await this.emailService.sendVerificationOtp(email, otp);
        }
        return {
            message: "OTP sent successfully",
            expiresAt: "10 mins"
        }
    }

    private async generateToken(userId: number, email: string) {
        const payload = {
            sub: userId,
            email: email,
        };
        return this.jwtService.signAsync(payload);
    }



}
