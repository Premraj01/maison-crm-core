import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  /** Recipient — the PostgreSQL user id. */
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ index: true })
  orgId?: string;

  /** Machine-readable kind, e.g. `lead.assigned`, `deal.won`. */
  @Prop({ required: true, index: true })
  type!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  body?: string;

  /** Deep link into the CRM, e.g. `/leads/42`. */
  @Prop()
  link?: string;

  @Prop({ type: [String], enum: NOTIFICATION_CHANNELS, default: ['in_app'] })
  channels!: NotificationChannel[];

  /** Arbitrary payload the UI can render against. */
  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ default: false, index: true })
  read!: boolean;

  @Prop()
  readAt?: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Drives the bell menu: this user's unread items, newest first.
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
