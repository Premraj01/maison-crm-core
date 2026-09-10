import { ApiProperty } from '@nestjs/swagger';

import type { PublicUser } from '../../users/users.types';

export class AuthResponseDto {
  @ApiProperty({ description: 'Bearer token for the REST API and the socket handshake.' })
  accessToken!: string;

  @ApiProperty({ description: 'Token lifetime, as configured by JWT_EXPIRES_IN.', example: '1d' })
  expiresIn!: string;

  @ApiProperty({ description: 'The signed-in user, without the password digest.' })
  user!: PublicUser;
}
