import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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

  @Get()
  @Roles('viewer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List leads — filter by stage, listing, or search' })
  findAll(@Query() query: QueryLeadDto) {
    return this.leads.findAll(query);
  }

  @Get(':id')
  @Roles('viewer')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.leads.findOne(id);
  }

  @Post()
  @Roles('agent')
  @ApiBearerAuth()
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('orgId') orgId: string | null,
  ) {
    // The signed-in user's organisation wins, as it does for properties.
    return this.leads.create({ ...dto, ...(orgId ? { orgId } : {}) }, actorId);
  }

  @Patch(':id')
  @Roles('agent')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leads.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.leads.remove(id, actorId);
  }
}
