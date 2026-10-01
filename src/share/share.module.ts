import { Module } from '@nestjs/common';
import { ShareController } from './share.controller.js';
import { ShareService } from './share.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
