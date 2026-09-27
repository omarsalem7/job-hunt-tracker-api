import { IsString, IsHexColor, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTagDto {
    @IsString()
    @IsNotEmpty({ message: 'Tag name cannot be empty' })
    name: string;

    @IsHexColor()
    @IsOptional()
    color?: string;
}