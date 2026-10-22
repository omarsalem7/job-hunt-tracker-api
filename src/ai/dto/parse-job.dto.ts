import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ParseJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Job description text cannot be empty' })
  @MinLength(20, { message: 'Job description text is too short to parse reliably (min 20 characters)' })
  @MaxLength(60000, { message: 'Job description exceeds maximum allowed length of 60,000 characters' })
  text: string;
}

export class ParsedJobResponseDto {
  company: string;
  role: string;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  summary: string;
  keyRequirements: string[];
  suggestedTags: string[];
}
