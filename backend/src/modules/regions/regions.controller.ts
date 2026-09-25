import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionsService } from './regions.service';

/**
 * Only the global roles manage or browse regions. `@Roles('owner')` admits an
 * owner and a system admin and nobody else — region heads included, who see
 * their own region through the scoped users, properties and leads endpoints.
 *
 * `GET /regions/mine` is the exception: any signed-in user may ask which
 * region they are in, since the answer names no other.
 */
@ApiTags('regions')
@ApiBearerAuth()
@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get('mine')
  @ApiOperation({ summary: "The signed-in user's own region, or null" })
  mine(@CurrentUser('regionId') regionId: string | null) {
    return this.regions.mine(regionId);
  }

  @Get()
  @Roles('owner')
  @ApiOperation({ summary: 'Every region with team, listing and lead counts' })
  findAll() {
    return this.regions.findAll();
  }

  @Get(':id')
  @Roles('owner')
  @ApiOperation({ summary: "One region's team, properties and leads" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.regions.findOne(id);
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateRegionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.regions.create(dto, actor);
  }

  @Patch(':id')
  @Roles('owner')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.regions.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.regions.remove(id, actor);
  }
}
