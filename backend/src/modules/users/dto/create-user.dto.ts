import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import type { UserRole } from '../entities/user.entity';

export const USER_ROLES: UserRole[] = ['owner', 'admin', 'agent', 'viewer'];

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(200)
  fullName!: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
