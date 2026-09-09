import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { NOTIFICATION_CHANNELS, NotificationChannel } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsString()
  @MaxLength(128)
  type!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsIn(NOTIFICATION_CHANNELS, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
