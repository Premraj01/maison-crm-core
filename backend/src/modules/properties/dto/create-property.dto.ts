import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import {
  LISTING_TYPES,
  PROPERTY_KINDS,
  PROPERTY_STATUSES,
  PROPERTY_TAGS,
  type ListingType,
  type PropertyKind,
  type PropertyStatus,
  type PropertyTag,
} from '../properties.types';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Casa Solana' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Malibu' })
  @IsString()
  @MaxLength(400)
  address!: string;

  @ApiProperty({ enum: PROPERTY_KINDS })
  @IsIn(PROPERTY_KINDS)
  kind!: PropertyKind;

  @ApiProperty({ enum: LISTING_TYPES })
  @IsIn(LISTING_TYPES)
  listing!: ListingType;

  /** "Sold" and "Rented" archive the listing; it stays visible but blurred. */
  @ApiPropertyOptional({ enum: PROPERTY_STATUSES, default: 'Available' })
  @IsOptional()
  @IsIn(PROPERTY_STATUSES)
  status?: PropertyStatus;

  /**
   * Optional throughout: a listing is often published before the owner has
   * settled on a number, and bare land has no rooms.
   */
  @ApiPropertyOptional({ example: 4800000, description: 'Whole currency units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 4800, description: 'Square feet' })
  @IsOptional()
  @IsInt()
  @Min(0)
  area?: number;

  /** Presentation, rendered by the public website. */
  @ApiPropertyOptional({ enum: PROPERTY_TAGS, description: 'Badge shown on the card' })
  @IsOptional()
  @IsIn(PROPERTY_TAGS)
  tag?: PropertyTag;

  @ApiPropertyOptional({ default: false, description: 'Render the card tall on the site' })
  @IsOptional()
  @IsBoolean()
  portrait?: boolean;

  @ApiPropertyOptional({ default: false, description: "Show in the site's featured trio" })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  details?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @ArrayMaxSize(50)
  features?: string[];

  /**
   * Public paths or absolute URLs. Capped because the CRM's upload field can
   * send data URLs, and an unbounded list of those would be a large row.
   */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  images?: string[];

  /**
   * Set by the caller only when seeding or importing; normally taken from the
   * signed-in user so a listing lands in their organisation.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;

  /**
   * The region whose team sells this listing. A regional user's own region is
   * used whatever is sent; an owner may name any region, or null to unplace it.
   */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  regionId?: string | null;

  /** Omit and the server derives one from `name`. */
  @ApiPropertyOptional({ example: 'casa-solana' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}
