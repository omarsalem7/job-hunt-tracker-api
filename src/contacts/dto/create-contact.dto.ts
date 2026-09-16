import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUrl } from "class-validator";

export class CreateContactDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsOptional()
    email: string

    @IsPhoneNumber()
    @IsOptional()
    phone: string

    @IsString()
    @IsOptional()
    role: string

    @IsUrl()
    @IsOptional()
    linkedInUrl: string

    @IsString()
    @IsOptional()
    notes: string

    @IsOptional()
    @IsInt()
    applicationId?: number;
}