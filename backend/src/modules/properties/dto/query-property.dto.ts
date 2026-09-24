import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
  LISTING_TYPES,
  PROPERTY_KINDS,
  PROPERTY_STATUSES,
  type ListingType,
  type PropertyKind,
  type PropertyStatus,
} from '../properties.types';

/** Filters behind `GET /properties`, shared by the CRM and the public site. */
export class QueryPropertyDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROPERTY_KINDS })
  @IsOptional()
  @IsIn(PROPERTY_KINDS)
  kind?: PropertyKind;

  @ApiPropertyOptional({ enum: LISTING_TYPES })
  @IsOptional()
  @IsIn(LISTING_TYPES)
  listing?: ListingType;

  @ApiPropertyOptional({ enum: PROPERTY_STATUSES })
  @IsOptional()
  @IsIn(PROPERTY_STATUSES)
  status?: PropertyStatus;

  /**
   * `?archived=true` returns only sold and rented listings; `false` only those
   * still on offer. Omitted, everything comes back — the public site shows the
   * archived ones too, blurred.
   */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  archived?: boolean;

  /** `?featured=true` backs the website's homepage trio. */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  featured?: boolean;

  /** Case-insensitive match against name and address. */
  @ApiPropertyOptional({ example: 'malibu' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
