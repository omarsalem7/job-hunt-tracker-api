import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) { }

  async getStats(userId: number) {
    const list = await this.prisma.application.groupBy({
      by: ['stage'],
      where: { userId },
      _count: {
        id: true,
      },
    });
    const stats = {
      total: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    list.forEach((item) => {
      stats[item.stage] = item._count.id;
      stats.total += item._count.id;
    });
    return stats;
  }

  async getList(userId: number, paginationDto: PaginationDto) {
    const { limit, page } = paginationDto;
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.application.count({
        where: { userId },
      }),
    ]);

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getListBoard(userId: number) {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      applied: applications.filter((a) => a.stage === ApplicationStage.applied),
      interviewing: applications.filter((a) => a.stage === ApplicationStage.interview),
      offer: applications.filter((a) => a.stage === ApplicationStage.offer),
      rejected: applications.filter((a) => a.stage === ApplicationStage.rejected),
    };
  }

  async getById(userId: number, id: number) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
      include: {
        contacts: true,
      }
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
