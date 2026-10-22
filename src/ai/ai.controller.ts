import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AiService } from './ai.service.js';
import { ParseJobDto } from './dto/parse-job.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('parse-job')
  @HttpCode(HttpStatus.OK)
  parseJob(@Body() dto: ParseJobDto) {
    return this.aiService.parseJobDescription(dto.text);
  }
}
