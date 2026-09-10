import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { PublicUser } from '../users/users.types';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange email and password for a bearer token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Incorrect email or password' })
  login(@Body() dto: LoginDto, @Req() request: AuthenticatedRequest): Promise<AuthResponseDto> {
    return this.auth.login(dto, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  /**
   * Lets the client confirm a stored token is still good, and refresh the
   * cached profile, without holding a session server-side.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The currently signed-in user' })
  me(@CurrentUser('id') userId: string): Promise<PublicUser> {
    return this.auth.me(userId);
  }
}
