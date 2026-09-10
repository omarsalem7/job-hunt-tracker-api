import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: "Password must be at least 6 characters long" })
    password: string;
}