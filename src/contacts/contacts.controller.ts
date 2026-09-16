import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { ContactsService } from './contacts.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Get()
    findAll(@CurrentUser('id') userId: number) {
        return this.contactsService.findAll(userId);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
        return this.contactsService.findOne(userId, id);
    }

    @Post()
    create(@CurrentUser('id') userId: number, @Body() createContactDto: CreateContactDto) {
        return this.contactsService.create(userId, createContactDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateContactDto: UpdateContactDto, @CurrentUser('id') userId: number) {
        return this.contactsService.update(userId, id, updateContactDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
        return this.contactsService.delete(userId, id);
    }
}
