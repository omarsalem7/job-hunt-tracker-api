import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @ApiProperty({ example: '123456', description: '6-digit verification code' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
    code: string;
}
