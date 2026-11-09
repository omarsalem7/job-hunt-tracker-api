import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from './ai.service.js';

describe('AiService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw ServiceUnavailableException if GEMINI_API_KEY is not configured', async () => {
    configService = {
      get: vi.fn(() => undefined),
    } as unknown as ConfigService;

    const service = new AiService(configService);

    await expect(service.parseJobDescription('Some long job description')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw BadRequestException if text is only whitespace', async () => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'fake-gemini-key';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new AiService(configService);

    await expect(service.parseJobDescription('   ')).rejects.toThrow(BadRequestException);
  });

  it('should parse and return structured job data when Gemini succeeds', async () => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'fake-gemini-key';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new AiService(configService);

    const mockAiResponse = {
      company: 'TechCorp',
      role: 'Backend Engineer',
      stage: 'applied',
      notes: '**Location:** Remote\n**Salary:** $120,000\n**Summary:** Building high throughput APIs.',
    };

    (service as any).geminiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(mockAiResponse),
        }),
      },
    };

    const result = await service.parseJobDescription('We are hiring a Backend Engineer at TechCorp...');

    expect(result.company).toBe('TechCorp');
    expect(result.role).toBe('Backend Engineer');
    expect(result.stage).toBe('applied');
    expect(result.notes).toContain('Remote');
  });

  it('should map Gemini 429 quota exhaustion to HttpStatus.TOO_MANY_REQUESTS', async () => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'fake-gemini-key';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new AiService(configService);

    (service as any).geminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue({
          status: 429,
          message: 'RESOURCE_EXHAUSTED',
        }),
      },
    };

    await expect(service.parseJobDescription('Valid job post content')).rejects.toThrow(
      new HttpException(
        'Gemini AI quota reached or rate limit exceeded. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });
});
