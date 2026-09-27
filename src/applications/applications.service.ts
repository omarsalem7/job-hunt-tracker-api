import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        include: { tags: true },
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
      include: {
        tags: true, // 👈 Now cards have their tags!
      },
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
        contacts: true, tags: true,
      }
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async create(userId: number, dto: CreateApplicationDto) {
    const { tagIds, ...applicationData } = dto;

    // Verify tagIds belong to this user (anti-IDOR check)
    if (tagIds?.length) {
      const userTags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds }, userId },
        select: { id: true },
      });
      if (userTags.length !== tagIds.length) {
        throw new BadRequestException('One or more tag IDs are invalid');
      }
    }

    return this.prisma.application.create({
      data: {
        ...applicationData,
        appliedDate: applicationData.appliedDate ? new Date(applicationData.appliedDate) : undefined,
        userId,
        // Many-to-Many connection:
        tags: tagIds?.length ? {
          connect: tagIds.map((id) => ({ id })),
        } : undefined,
      },
      include: {
        tags: true,
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


  async setTags(userId: number, applicationId: number, tagIds: number[]) {
    // 1. Ensure the application exists and belongs to this user
    await this.getById(userId, applicationId);

    // 2. Verify all tags belong to this user
    if (tagIds.length > 0) {
      const userTags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds }, userId },
        select: { id: true },
      });
      if (userTags.length !== tagIds.length) {
        throw new BadRequestException('One or more tag IDs are invalid');
      }
    }

    // 3. 'set' removes previous tags and connects the new ones atomically!
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        tags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
      include: {
        tags: true,
      },
    });
  }

}
