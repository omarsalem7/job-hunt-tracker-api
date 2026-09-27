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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service.js';
import { CreateTagDto } from './dto/createTag.dto.js';
import { UpdateTagDto } from './dto/updateTag.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Get()
    @ApiOperation({ summary: 'List all tags created by this user' })
    findAll(@CurrentUser('id') userId: number) {
        return this.tagsService.findAll(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single tag with its tagged applications' })
    findOne(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tagsService.findOne(userId, id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new custom tag' })
    create(
        @CurrentUser('id') userId: number,
        @Body() createTagDto: CreateTagDto,
    ) {
        return this.tagsService.create(userId, createTagDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update tag name or color' })
    update(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTagDto: UpdateTagDto,
    ) {
        return this.tagsService.update(userId, id, updateTagDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a tag (detaches from all applications)' })
    delete(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tagsService.delete(userId, id);
    }
}
