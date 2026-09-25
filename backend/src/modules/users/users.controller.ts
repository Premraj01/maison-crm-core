import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * Reads are open to any signed-in user, but scoped: a regional user sees only
 * the people in their own region (see `region-scope.ts`). Writes are
 * administrative. `@Roles`
 * admits anything more privileged too, so `@Roles('region_head')` also lets an
 * owner through — see `roleAtLeast` in `users.types.ts`.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles('region_head')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.users.findAll(query, viewer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.users.findOne(id, viewer);
  }

  @Patch(':id')
  @Roles('region_head')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.remove(id, actor);
  }
}
