import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShareService } from './share.service.js';
import { CreateShareLinkDto } from './dto/create-share-link.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Share')
@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  /**
   * Protected: Create a new share link
   */
  @ApiOperation({ summary: 'Generate a new shareable link for the current user board' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser('id') userId: number,
    @Body() createShareLinkDto: CreateShareLinkDto,
  ) {
    return this.shareService.create(userId, createShareLinkDto);
  }

  /**
   * Protected: Get all share links created by the current user
   */
  @ApiOperation({ summary: 'List all share links created by current user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findMyLinks(@CurrentUser('id') userId: number) {
    return this.shareService.findAllUserLinks(userId);
  }

  /**
   * Protected: Revoke/delete a share link
   */
  @ApiOperation({ summary: 'Revoke and delete a share link' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  revoke(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.shareService.revoke(userId, id);
  }

  /**
   * PUBLIC: View a shared board using token (no authentication required)
   */
  @ApiOperation({ summary: 'Publicly access a shared application board via token' })
  @Get(':token')
  getSharedBoard(@Param('token') token: string) {
    return this.shareService.getSharedBoard(token);
  }
}
