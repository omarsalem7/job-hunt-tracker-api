import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateShareLinkDto {

    @IsBoolean()
    @IsOptional()
    includeNotes?: boolean = false; // Default to false if omitted

    @IsInt()
    @Min(1)
    @IsOptional()
    expiresInDays?: number;


    @IsBoolean()
    @IsOptional()
    includeContacts?: boolean = false; // Default to false if omitted
}