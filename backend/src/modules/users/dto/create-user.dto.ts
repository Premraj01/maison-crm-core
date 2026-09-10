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

import { USER_ROLES, type UserRole } from '../users.types';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@maison.co' })
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

  @ApiPropertyOptional({ enum: USER_ROLES, default: 'agent' })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
