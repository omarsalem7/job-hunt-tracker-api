import { ApplicationStage } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export { ApplicationStage };

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsEnum(ApplicationStage, {
    message: `stage must be one of: ${Object.values(ApplicationStage).join(', ')}`,
  })
  @IsOptional()
  stage?: ApplicationStage;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  appliedDate?: string;

  @IsArray()
  @IsInt({ each: true, message: 'Each tag ID must be an integer' })
  @IsOptional()
  tagIds?: number[]
}
