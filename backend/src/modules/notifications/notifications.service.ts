import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';

import { PaginatedResult, paginated } from '../../common/dto/pagination.dto';
import { RealtimeService } from '../../realtime/realtime.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NOTIFICATION_EVENTS } from './notification.events';
import { Notification, NotificationDocument } from './schemas/notification.schema';

/**
 * Worked example of the realtime plumbing: persist to Mongo, then push the same
 * record down the user's socket room. Copy this shape for any other feature that
 * needs live updates.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = await this.model.create({ ...dto, read: false });

    this.realtime.emitToUser(dto.userId, NOTIFICATION_EVENTS.CREATED, notification.toObject());
    await this.emitUnreadCount(dto.userId);

    return notification;
  }

  /** Same payload to many recipients — one insert, one emit per user. */
  async createMany(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<NotificationDocument[]> {
    const docs = await this.model.create(
      userIds.map((userId) => ({ ...dto, userId, read: false })),
    );

    await Promise.all(
      docs.map(async (doc) => {
        this.realtime.emitToUser(doc.userId, NOTIFICATION_EVENTS.CREATED, doc.toObject());
        await this.emitUnreadCount(doc.userId);
      }),
    );

    return docs;
  }

  async find(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedResult<NotificationDocument>> {
    const filter: QueryFilter<Notification> = { userId };
    if (query.type) filter.type = query.type;
    if (query.read !== undefined) filter.read = query.read;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean<NotificationDocument[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return paginated(items, total, query);
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, read: false }).exec();
  }

  async markAsRead(userId: string, id: string): Promise<NotificationDocument> {
    const notification = await this.model
      .findOneAndUpdate({ _id: id, userId }, { read: true, readAt: new Date() }, { new: true })
      .exec();

    if (!notification) throw new NotFoundException(`Notification ${id} not found`);

    this.realtime.emitToUser(userId, NOTIFICATION_EVENTS.READ, { id });
    await this.emitUnreadCount(userId);

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.model
      .updateMany({ userId, read: false }, { read: true, readAt: new Date() })
      .exec();

    this.realtime.emitToUser(userId, NOTIFICATION_EVENTS.ALL_READ, {});
    await this.emitUnreadCount(userId);

    return { updated: result.modifiedCount };
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.model.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Notification ${id} not found`);
    await this.emitUnreadCount(userId);
  }

  private async emitUnreadCount(userId: string): Promise<void> {
    const count = await this.unreadCount(userId);
    this.realtime.emitToUser(userId, NOTIFICATION_EVENTS.UNREAD_COUNT, { count });
  }
}
