import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) { }

    findAll(userId: number) {
        return this.prisma.contact.findMany({
            where: { userId },
            include: {
                application: {
                    select: { id: true, company: true, role: true },
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(userId: number, id: number) {
        const contact = await this.prisma.contact.findFirst({
            where: { id, userId },
            include: {
                application: {
                    select: { id: true, company: true, role: true },
                },
            },
        });
        if (!contact) {
            throw new NotFoundException(`Contact with ID ${id} not found`);
        }
        return contact;
    }


    async create(userId: number, data: CreateContactDto) {
        if (data.applicationId) {
            const application = await this.prisma.application.findFirst({
                where: { id: data.applicationId, userId },
            });
            if (!application) {
                throw new BadRequestException(`Application with ID ${data.applicationId} not found`);
            }
        }
        return this.prisma.contact.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async update(userId: number, id: number, data: UpdateContactDto) {
        // Ensure contact exists and belongs to this user
        await this.findOne(userId, id);
        // If updating applicationId, verify the new application belongs to this user
        if (data.applicationId) {
            const application = await this.prisma.application.findFirst({
                where: { id: data.applicationId, userId },
            });
            if (!application) {
                throw new BadRequestException('Invalid application ID');
            }
        }
        return this.prisma.contact.update({
            where: { id },
            data,
        });
    }

    async delete(userId: number, id: number) {
        // Ensure contact exists and belongs to this user
        await this.findOne(userId, id);
        return this.prisma.contact.delete({
            where: { id },
        });
    }
}
