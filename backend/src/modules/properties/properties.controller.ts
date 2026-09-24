import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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
 */
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List listings — public, read by the website' })
  findAll(@Query() query: QueryPropertyDto) {
    return this.properties.findAll(query);
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Fetch one listing by UUID or by its website slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.properties.findOne(idOrSlug);
  }

  @Post()
  @Roles('agent')
  @ApiBearerAuth()
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('orgId') orgId: string | null,
  ) {
    // The signed-in user's organisation wins, so an agent cannot publish into
    // someone else's portfolio by passing an orgId in the body.
    return this.properties.create({ ...dto, ...(orgId ? { orgId } : {}) }, actorId);
  }

  @Patch(':id')
  @Roles('agent')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.properties.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.properties.remove(id, actorId);
  }
}
