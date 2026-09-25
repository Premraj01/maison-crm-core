import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ example: 'West Coast' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /** Short badge code. Stored upper-case, so "wc" and "WC" are one code. */
  @ApiProperty({ example: 'WC' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9-]{1,12}$/, { message: 'code must be 1–12 letters, digits or dashes' })
  code!: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
