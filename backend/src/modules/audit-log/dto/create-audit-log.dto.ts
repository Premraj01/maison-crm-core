import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @MaxLength(128)
  actorId!: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsString()
  @MaxLength(128)
  action!: string;

  @IsString()
  @MaxLength(64)
  entityType!: string;

  @IsString()
  @MaxLength(128)
  entityId!: string;

  @IsOptional()
  @IsObject()
  before?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  after?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
