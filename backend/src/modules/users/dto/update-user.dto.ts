import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/**
 * Password is deliberately absent: changing one is its own operation, with its
 * own authorisation rules, rather than a field on a general-purpose PATCH.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
