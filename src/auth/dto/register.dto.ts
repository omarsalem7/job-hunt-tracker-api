import { IsEmail, IsString, IsNotEmpty, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: "Password must be at least 6 characters long" })
    password: string;

    // @IsString()
    // @IsNotEmpty()
    // @MinLength(2, { message: "Name must be at least 2 characters long" })
    // name: string;
}