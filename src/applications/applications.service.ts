import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) { }

  async getList(userId: number) {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(userId: number, id: number) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async create(userId: number, dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: {
        ...dto,
        appliedDate: dto.appliedDate ? new Date(dto.appliedDate) : undefined,
        userId
      },
    });
  }

  async update(userId: number, id: number, dto: UpdateApplicationStageDto) {
    // Ensures ownership or throws 404
    await this.getById(userId, id);
    return this.prisma.application.update({
      where: { id },
      data: {
        stage: dto.stage,
      },
    });
  }

  async remove(userId: number, id: number) {
    // Ensures ownership or throws 404
    await this.getById(userId, id);
    return this.prisma.application.delete({
      where: { id },
    });
  }
}
