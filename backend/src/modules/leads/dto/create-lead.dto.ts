import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { LEAD_SOURCES, LEAD_STAGES, type LeadSource, type LeadStage } from '../leads.types';

/** What an authenticated agent may set when adding a lead by hand. */
export class CreateLeadDto {
  @ApiProperty({ example: 'Priya Shah' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ enum: LEAD_STAGES, default: 'New' })
  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: LeadStage;

  @ApiPropertyOptional({ enum: LEAD_SOURCES, default: 'Website' })
  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  interest?: string;

  @ApiPropertyOptional({ description: 'Estimated deal value, whole currency units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  /** The listing this lead is about, by id. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Agent the lead is assigned to' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}
