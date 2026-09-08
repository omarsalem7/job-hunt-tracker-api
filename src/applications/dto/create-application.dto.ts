import { ApplicationStage } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
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
}
