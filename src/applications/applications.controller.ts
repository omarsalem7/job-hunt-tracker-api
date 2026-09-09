import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Get()
  getApplications() {
    return this.applicationsService.getList();
  }

  @Get(':id')
  getApplicationById(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getById(id);
  }

  @Post()
  createApplication(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Patch(':id')
  updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() UpdateApplicationStageDto: UpdateApplicationStageDto,
  ) {
    return this.applicationsService.update(id, UpdateApplicationStageDto);
  }

  @Delete(':id')
  deleteApplication(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
