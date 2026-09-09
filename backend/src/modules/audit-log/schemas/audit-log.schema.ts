import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Append-only trail of who changed what. Stored in Mongo because the `before`/
 * `after` payloads differ per entity and would not fit a fixed relational shape.
 */
@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  /** Actor — the PostgreSQL user id, or `system` for automated writes. */
  @Prop({ required: true, index: true })
  actorId!: string;

  @Prop({ index: true })
  orgId?: string;

  /** Verb, e.g. `lead.status_changed`, `customer.deleted`. */
  @Prop({ required: true, index: true })
  action!: string;

  /** Target record type, e.g. `lead`, `customer`, `user`. */
  @Prop({ required: true, index: true })
  entityType!: string;

  @Prop({ required: true, index: true })
  entityId!: string;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  /** Free-form context: request id, source, reason, feature flags. */
  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Timeline queries ("everything that happened to this lead, newest first").
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ orgId: 1, createdAt: -1 });
