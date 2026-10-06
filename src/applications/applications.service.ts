import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStageDto } from './dto/update-application.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { FollowUpStatus } from './dto/follow-up.dto.js';

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
    const withStatus = applications.map((app) => ({
      ...app,
      followUpStatus: this.calculateFollowUpStatus(app),
    }));

    return {
      data: withStatus,
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

    const appsWithStatus = applications.map((a) => {
      return {
        ...a,
        followUpStatus: this.calculateFollowUpStatus(a),
      };
    });

    return {
      applied: appsWithStatus.filter((a) => a.stage === ApplicationStage.applied),
      interviewing: appsWithStatus.filter((a) => a.stage === ApplicationStage.interview),
      offer: appsWithStatus.filter((a) => a.stage === ApplicationStage.offer),
      rejected: appsWithStatus.filter((a) => a.stage === ApplicationStage.rejected),
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
    return { ...application, followUpStatus: this.calculateFollowUpStatus(application) };
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

  async markFollowedUp(userId: number, id: number) {
    const application = await this.prisma.application.findFirst({ where: { id, userId } })
    if (!application) {
      throw new NotFoundException('Application not found')
    }

    return this.prisma.application.update({ where: { id }, data: { lastFollowUpAt: new Date(), snoozeFollowUpUntil: null } })
  }

  async snoozeFollowUp(userId: number, id: number, days: number) {
    const application = await this.prisma.application.findFirst({ where: { id, userId } })
    if (!application)
      throw new NotFoundException('Application not found')
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    return this.prisma.application.update({ where: { id }, data: { snoozeFollowUpUntil: snoozeUntil } })
  }


  async getNotifications(userId: number) {
    const now = new Date();
    const apps = await this.prisma.application.findMany({
      where: {
        userId, stage: ApplicationStage.applied, OR: [
          { snoozeFollowUpUntil: null },
          { snoozeFollowUpUntil: { lte: now } },
        ],
      }, orderBy: { appliedDate: 'asc' }
    })
    const items = apps
      .map((app) => ({
        ...app,
        followUpStatus: this.calculateFollowUpStatus(app),
      }))
      .filter((app) => app.followUpStatus !== null);

    return {
      count: items.length,
      items
    }
  }


  private calculateFollowUpStatus(app: {
    stage: ApplicationStage;
    appliedDate: Date;
    lastFollowUpAt: Date | null;
    snoozeFollowUpUntil: Date | null;
  }): FollowUpStatus | null {
    if (app.stage !== ApplicationStage.applied) return null;

    const now = new Date();
    const isSnoozed = app.snoozeFollowUpUntil && app.snoozeFollowUpUntil > now;
    if (isSnoozed) return null;

    const daysSinceApplied = Math.floor((now.getTime() - app.appliedDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceFollowUp =
      app.lastFollowUpAt
        ? Math.floor((now.getTime() - app.lastFollowUpAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    if (daysSinceApplied >= 30) return FollowUpStatus.STALE_GHOSTED

    if (!app.lastFollowUpAt) {
      // Stale: no follow-up yet, 21+ days passed
      if (daysSinceApplied >= 21) {
        return FollowUpStatus.STALE_GHOSTED;
      }

      // 1st follow-up: no follow-up yet, 7+ days passed
      if (daysSinceApplied >= 7) {
        return FollowUpStatus.NEEDS_FIRST_FOLLOW_UP;
      }

    }

    // 2nd follow-up: first already sent, 7+ days passed since then
    if (app.lastFollowUpAt && daysSinceFollowUp && daysSinceFollowUp >= 7) {
      return FollowUpStatus.NEEDS_SECOND_FOLLOW_UP;
    }


    return null;
  }


}
