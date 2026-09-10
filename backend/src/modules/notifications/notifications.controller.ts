import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationsService } from './notifications.service';

/**
 * `:userId` is a path param only because auth is not wired yet — once a JWT
 * guard is in place, read the id off the request user instead.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notifications.create(dto);
  }

  @Get(':userId')
  find(@Param('userId') userId: string, @Query() query: QueryNotificationDto) {
    return this.notifications.find(userId, query);
  }

  @Get(':userId/unread-count')
  async unreadCount(@Param('userId') userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
  }

  @Patch(':userId/:id/read')
  markAsRead(@Param('userId') userId: string, @Param('id') id: string) {
    return this.notifications.markAsRead(userId, id);
  }

  @Patch(':userId/read-all')
  markAllAsRead(@Param('userId') userId: string) {
    return this.notifications.markAllAsRead(userId);
  }

  @Delete(':userId/:id')
  remove(@Param('userId') userId: string, @Param('id') id: string) {
    return this.notifications.remove(userId, id);
  }
}
