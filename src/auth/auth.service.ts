import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwtService: JwtService) { }

    async register(registerDto: RegisterDto) {
        const isEmailTaken = await this.prisma.user.findUnique({
            where: {
                email: registerDto.email.trim().toLowerCase(),
            },
            select: { id: true },
        });

        if (isEmailTaken) {
            throw new ConflictException('Email is already taken');
        }

        const passwordHash = await bcrypt.hash(registerDto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Generate token so the user is immediately logged in after registration
        const accessToken = await this.generateToken(user.id, user.email);
        return {
            user,
            accessToken,
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
        // 5. Exclude passwordHash from returned object
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }




    private async generateToken(userId: number, email: string) {
        const payload = {
            sub: userId,
            email: email,
        };
        return this.jwtService.signAsync(payload);
    }

}
