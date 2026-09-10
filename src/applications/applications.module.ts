import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [AuthModule]
})
export class ApplicationsModule { }
