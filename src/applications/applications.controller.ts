import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Get()
  getApplications(@CurrentUser() user: { id: number }) {
    return this.applicationsService.getList(user.id);
  }

  @Get(':id')
  getApplicationById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.applicationsService.getById(user.id, id);
  }

  @Post()
  createApplication(@Body() createApplicationDto: CreateApplicationDto, @CurrentUser() user: { id: number }) {
    return this.applicationsService.create(user.id, createApplicationDto);
  }

  @Patch(':id')
  updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() UpdateApplicationStageDto: UpdateApplicationStageDto,
    @CurrentUser() user: { id: number }
  ) {
    return this.applicationsService.update(user.id, id, UpdateApplicationStageDto);
  }

  @Delete(':id')
  deleteApplication(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.applicationsService.remove(user.id, id);
  }
}
