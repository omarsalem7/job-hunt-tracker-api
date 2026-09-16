import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Get('stats')
  getApplicationsStats(@CurrentUser('id') userId: number) {
    return this.applicationsService.getStats(userId);
  }

  @Get('board')
  getApplicationsBoard(@CurrentUser('id') userId: number) {
    return this.applicationsService.getListBoard(userId);
  }

  @Get()
  getApplications(@CurrentUser('id') userId: number, @Query() paginationDto: PaginationDto) {
    return this.applicationsService.getList(userId, paginationDto);
  }

  @Get(':id')
  getApplicationById(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.applicationsService.getById(userId, id);
  }

  @Post()
  createApplication(@Body() createApplicationDto: CreateApplicationDto, @CurrentUser('id') userId: number) {
    return this.applicationsService.create(userId, createApplicationDto);
  }

  @Patch(':id')
  updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() UpdateApplicationStageDto: UpdateApplicationStageDto,
    @CurrentUser('id') userId: number
  ) {
    return this.applicationsService.update(userId, id, UpdateApplicationStageDto);
  }

  @Delete(':id')
  deleteApplication(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.applicationsService.remove(userId, id);
  }
}
