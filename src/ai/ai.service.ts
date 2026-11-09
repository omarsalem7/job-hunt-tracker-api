import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import { ApplicationStage } from '@prisma/client';
import { ParsedJobResponseDto } from './dto/parse-job.dto.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiClient: GoogleGenAI | null = null;
  private readonly geminiModel: string;

  constructor(private readonly configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.geminiModel =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash-lite';

    if (geminiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });
      this.logger.log(`🤖 Google Gemini AI initialized with model: ${this.geminiModel}`);
    } else {
      this.logger.warn(
        '⚠️ GEMINI_API_KEY is not configured in .env. AI endpoints will throw ServiceUnavailableException.',
      );
    }
  }

  /**
   * Parses raw job posting text and extracts structured details using Gemini.
   */
  async parseJobDescription(rawText: string): Promise<ParsedJobResponseDto> {
    const trimmedText = rawText.trim();
    if (!trimmedText) {
      throw new BadRequestException('Job description text cannot be empty');
    }

    if (!this.geminiClient) {
      throw new ServiceUnavailableException(
        'Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.',
      );
    }

    const prompt = `You are an expert career assistant and ATS data extractor.
Analyze the following job description and extract structured information into a strict JSON object that matches the Application entity format.

Guidelines:
1. "company": Name of the hiring company. If not mentioned, return "Unknown".
2. "role": Clean official job title (without emojis or marketing words like "URGENT").
3. "stage": Always set to "applied".
4. "notes": A formatted markdown string containing:
   - **Location:** (City, Country, Remote/Hybrid status if mentioned)
   - **Salary:** (Disclosed compensation or "Not specified")
   - **Job Type:** (e.g. Full-time, Contract if mentioned)
   - **Summary:** (2 to 3 sentences summarizing the role and team mission)
   - **Key Requirements:** (Bullet points of the 3 to 6 most critical technical skills/qualifications)
   - **Tags / Keywords:** (Comma-separated list of 3 to 6 relevant tags, e.g. Remote, TypeScript, Node.js)

Job Posting:
"""
${trimmedText}
"""`;

    try {
      const response = await this.geminiClient.models.generateContent({
        model: this.geminiModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              role: { type: Type.STRING },
              stage: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['company', 'role', 'stage', 'notes'],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new InternalServerErrorException('Gemini returned an empty response.');
      }

      const parsed: ParsedJobResponseDto = JSON.parse(responseText);

      // Default stage to applied
      parsed.stage = ApplicationStage.applied;

      return parsed;
    } catch (error: any) {
      this.logger.error(`Failed to parse job description with Gemini: ${error?.message || error}`);

      if (
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED')
      ) {
        throw new HttpException(
          'Gemini AI quota reached or rate limit exceeded. Please wait a moment and try again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to parse job description using Gemini: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
