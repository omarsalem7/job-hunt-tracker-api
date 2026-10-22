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
Analyze the following job description and extract structured information into a strict JSON object.

Guidelines:
1. "company": Name of the hiring company. If not mentioned, return "Unknown".
2. "role": Clean official job title (without emojis or marketing words like "URGENT").
3. "location": City, Country, or Remote status (e.g. "Remote", "Berlin (Hybrid)"). If unmentioned, return null.
4. "salary": Extracted compensation or salary range. If unmentioned, return null.
5. "jobType": Employment type (e.g. "Full-time", "Contract", "Part-time", "Internship"). If unmentioned, return null.
6. "summary": Concise 2 to 3 sentence summary of the role, responsibilities, and team mission.
7. "keyRequirements": Array of 3 to 6 key qualifications or technical skills.
8. "suggestedTags": Array of 3 to 6 relevant tags for sorting (e.g. ["Remote", "TypeScript", "Node.js"]).

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
              location: { type: Type.STRING, nullable: true },
              salary: { type: Type.STRING, nullable: true },
              jobType: { type: Type.STRING, nullable: true },
              summary: { type: Type.STRING },
              keyRequirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['company', 'role', 'summary', 'keyRequirements', 'suggestedTags'],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new InternalServerErrorException('Gemini returned an empty response.');
      }

      const parsed: ParsedJobResponseDto = JSON.parse(responseText);

      // Sanitize and deduplicate tags
      if (Array.isArray(parsed.suggestedTags)) {
        parsed.suggestedTags = Array.from(
          new Set(parsed.suggestedTags.map((t) => String(t).trim()).filter(Boolean)),
        );
      }

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
