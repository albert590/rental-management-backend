import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { NotificationsService } from './notifications.service';

import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  // =========================
  // CREATE
  // =========================

  @Post()
  create(
    @Body()
    createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      createNotificationDto,
    );
  }

  // =========================
  // ALL NOTIFICATIONS
  // =========================

  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }

  // =========================
  // MY NOTIFICATIONS
  // =========================

  @Get('mine')
  findMine(@Req() req: any) {
    return this.notificationsService.findForUser(
      req.user.sub,
    );
  }

  // =========================
  // ONE NOTIFICATION
  // =========================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  // =========================
  // MARK ONE READ
  // =========================

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(
      id,
    );
  }

  // =========================
  // MARK ALL READ
  // =========================

  @Patch('read-all')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  // =========================
  // DELETE
  // =========================

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}