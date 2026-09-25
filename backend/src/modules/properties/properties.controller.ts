import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

/**
 * The only controller with public reads: the beacon-estates website is an
 * anonymous visitor and still has to render the portfolio, so the two GETs opt
 * out of the global `JwtAuthGuard`. Writes stay behind it — an agent may
 * publish and edit, and only an admin may take a listing down.
 *
 * Reads return the `publicPropertySelect` projection, so nothing internal
 * (`deletedAt`) reaches an anonymous caller.
 *
 * The reads are also region-aware: when the CRM sends its token, a regional
 * user gets their own region's listings only. The website sends none and still
 * gets the whole public portfolio. Writes are always confined to the caller's
 * region — see `region-scope.ts`.
 */
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List listings — public, read by the website' })
  findAll(@Query() query: QueryPropertyDto, @CurrentUser() viewer?: AuthenticatedUser) {
    return this.properties.findAll(query, viewer);
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Fetch one listing by UUID or by its website slug' })
  findOne(@Param('idOrSlug') idOrSlug: string, @CurrentUser() viewer?: AuthenticatedUser) {
    return this.properties.findOne(idOrSlug, viewer);
  }

  @Post()
  @Roles('property_advisor')
  @ApiBearerAuth()
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // The signed-in user's organisation wins, so an advisor cannot publish
    // into someone else's portfolio by passing an orgId in the body.
    return this.properties.create({ ...dto, ...(actor.orgId ? { orgId: actor.orgId } : {}) }, actor);
  }

  @Patch(':id')
  @Roles('property_advisor')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.properties.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('region_head')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.properties.remove(id, actor);
  }
}
