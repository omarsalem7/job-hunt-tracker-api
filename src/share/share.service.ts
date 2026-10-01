import {
  Injectable,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateShareLinkDto } from './dto/create-share-link.dto.js';

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Generates a new shareable link for the logged-in user
   */
  async create(userId: number, dto: CreateShareLinkDto) {
    const { includeNotes = false, includeContacts = false, expiresInDays } = dto;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.shareLink.create({
      data: {
        userId,
        includeNotes,
        includeContacts,
        expiresAt,
      },
    });
  }

  /**
   * Retrieves all share links created by the logged-in user
   */
  async findAllUserLinks(userId: number) {
    return this.prisma.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revokes (deletes) a share link, ensuring user ownership (anti-IDOR)
   */
  async revoke(userId: number, id: number) {
    const link = await this.prisma.shareLink.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException(`Share link with ID ${id} not found`);
    }

    await this.prisma.shareLink.delete({
      where: { id },
    });

    return { message: 'Share link successfully revoked' };
  }

  /**
   * Public: Fetches the job board by token with privacy filtering
   */
  async getSharedBoard(token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            email: true, // Only show owner's email or display identifier, no passwordHash!
          },
        },
      },
    });

    if (!link || !link.isActive) {
      throw new NotFoundException('Share link not found or inactive');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException('This share link has expired');
    }

    // Fetch applications respecting the privacy settings
    const applications = await this.prisma.application.findMany({
      where: { userId: link.userId },
      include: {
        tags: true,
        // Conditionally include contacts only if allowed
        contacts: link.includeContacts
          ? {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              phone: true,
              linkedInUrl: true,
              notes: link.includeNotes, // Mask contact notes if notes are private
            },
          }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask application notes if includeNotes is disabled
    const sanitizedApplications = applications.map((app) => ({
      ...app,
      notes: link.includeNotes ? app.notes : null,
    }));

    return {
      sharedBy: link.user.email,
      settings: {
        includeNotes: link.includeNotes,
        includeContacts: link.includeContacts,
        expiresAt: link.expiresAt,
      },
      board: {
        applied: sanitizedApplications.filter(
          (a) => a.stage === ApplicationStage.applied,
        ),
        interviewing: sanitizedApplications.filter(
          (a) => a.stage === ApplicationStage.interview,
        ),
        offer: sanitizedApplications.filter(
          (a) => a.stage === ApplicationStage.offer,
        ),
        rejected: sanitizedApplications.filter(
          (a) => a.stage === ApplicationStage.rejected,
        ),
      },
    };
  }
}
