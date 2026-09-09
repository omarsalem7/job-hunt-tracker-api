import { ApplicationStage } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateApplicationStageDto {
  @IsEnum(ApplicationStage, {
    message: `stage must be one of: ${Object.values(ApplicationStage).join(', ')}`,
  })
  @IsNotEmpty()
  stage: ApplicationStage;
}
