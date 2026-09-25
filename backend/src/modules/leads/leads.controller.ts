import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { EnquiryThrottleGuard } from './guards/enquiry-throttle.guard';
import { LeadsService } from './leads.service';

/**
 * Leads are internal — every route here needs a token except `POST /enquiries`,
 * which is the public website's viewing form and is rate limited because of it.
 * Note the asymmetry with properties: listings are public to READ, leads are
 * public to WRITE. Nothing anonymous can ever read a lead back.
 *
 * Every authenticated route is region-scoped: outside the global roles, a user
 * only sees and touches leads in their own region — see `region-scope.ts`.
 */
@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('enquiries')
  @Public()
  @UseGuards(EnquiryThrottleGuard)
  @ApiOperation({
    summary: "Capture an enquiry from the public website's viewing form",
    description:
      'Anonymous. Stage, source and organisation are set by the server; the listing is named by its public slug.',
  })
  capture(@Body() dto: CreateEnquiryDto) {
    return this.leads.captureEnquiry(dto);
  }

  // No `@Roles`, so any signed-in user may read — which is what the old
  // `@Roles('viewer')` meant, viewer having been the least privileged role.
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List leads — filter by stage, listing, or search' })
  findAll(@Query() query: QueryLeadDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.leads.findAll(query, viewer);
  }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.leads.findOne(id, viewer);
  }

  @Post()
  @Roles('property_advisor')
  @ApiBearerAuth()
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // The signed-in user's organisation wins, as it does for properties.
    return this.leads.create({ ...dto, ...(actor.orgId ? { orgId: actor.orgId } : {}) }, actor);
  }

  @Patch(':id')
  @Roles('property_advisor')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leads.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('region_head')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.leads.remove(id, actor);
  }
}
