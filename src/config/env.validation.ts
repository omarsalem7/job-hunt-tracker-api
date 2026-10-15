import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL environment variable is required' })
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET environment variable is required' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;


  @IsString()
  @IsNotEmpty({ message: 'GOOGLE_CLIENT_ID is required for Google OAuth' })
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty({ message: 'GOOGLE_CLIENT_SECRET is required for Google OAuth' })
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  @IsNotEmpty({ message: 'GOOGLE_CALLBACK_URL is required for Google OAuth' })
  GOOGLE_CALLBACK_URL: string;

}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`\n❌ Environment Validation Failed:\n${errors.toString()}`);
  }

  return validatedConfig;
}
