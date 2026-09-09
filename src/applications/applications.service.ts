import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) { }

  async getList() {
    return this.prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: number) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async create(dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: {
        ...dto,
        appliedDate: dto.appliedDate ? new Date(dto.appliedDate) : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateApplicationStageDto) {
    await this.getById(id);

    return this.prisma.application.update({
      where: { id },
      data: {
        stage: dto.stage,
      },
    });
  }

  async remove(id: number) {
    await this.getById(id);

    return this.prisma.application.delete({
      where: { id },
    });
  }
}
