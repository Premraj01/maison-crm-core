import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * Reads are open to any signed-in user; writes are administrative. `@Roles`
 * admits anything more privileged too, so `@Roles('admin')` also lets an owner
 * through — see `roleAtLeast` in `users.types.ts`.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: string) {
    return this.users.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser('id') actorId: string) {
    return this.users.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.users.remove(id, actorId);
  }
}
