import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
  imports: [AuthModule]
})
export class ContactsModule { }
