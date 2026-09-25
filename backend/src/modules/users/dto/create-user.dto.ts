import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DEFAULT_USER_ROLE, USER_ROLES, type UserRole } from '../users.types';

export class CreateUserDto {
  @ApiProperty({ example: 'advisor@maison.co' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Sam Rivera' })
  @IsString()
  @MaxLength(200)
  fullName!: string;

  /** Hashed before it reaches Postgres — see `common/crypto/password.ts`. */
  @ApiProperty({ minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;

  /**
   * The region this person works in. Ignored for the global roles, which have
   * none; a region head's own region is used whatever is sent.
   */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  regionId?: string | null;

  @ApiPropertyOptional({ enum: USER_ROLES, default: DEFAULT_USER_ROLE })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
