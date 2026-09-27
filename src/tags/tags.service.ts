import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTagDto } from './dto/createTag.dto.js';
import { UpdateTagDto } from './dto/updateTag.dto.js';

@Injectable()
export class TagsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: number) {
        return this.prisma.tag.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { applications: true }, // Returns { _count: { applications: 3 } }
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(userId: number, id: number) {
        const tag = await this.prisma.tag.findFirst({
            where: { id, userId },
            include: {
                applications: {
                    select: { id: true, company: true, role: true, stage: true },
                },
            },
        });

        if (!tag) {
            throw new NotFoundException(`Tag with ID ${id} not found`);
        }

        return tag;
    }

    async create(userId: number, createTagDto: CreateTagDto) {
        const normalizedName = createTagDto.name.trim();

        // Check if user already has a tag with this name
        const existing = await this.prisma.tag.findUnique({
            where: {
                userId_name: {
                    userId,
                    name: normalizedName,
                },
            },
        });

        if (existing) {
            throw new ConflictException(`Tag "${normalizedName}" already exists`);
        }

        return this.prisma.tag.create({
            data: {
                name: normalizedName,
                color: createTagDto.color,
                userId,
            },
        });
    }

    async update(userId: number, id: number, updateDto: UpdateTagDto) {
        // Ensures ownership or throws 404
        await this.findOne(userId, id);

        if (updateDto.name) {
            const normalizedName = updateDto.name.trim();
            const duplicate = await this.prisma.tag.findFirst({
                where: {
                    userId,
                    name: normalizedName,
                    NOT: { id },
                },
            });
            if (duplicate) {
                throw new ConflictException(`Tag "${normalizedName}" already exists`);
            }
            updateDto.name = normalizedName;
        }

        return this.prisma.tag.update({
            where: { id },
            data: updateDto,
        });
    }

    async delete(userId: number, id: number) {
        // Ensures ownership or throws 404
        await this.findOne(userId, id);

        return this.prisma.tag.delete({
            where: { id },
        });
    }
}
