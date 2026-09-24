import { Module } from '@nestjs/common';

import { EnquiryThrottleGuard } from './guards/enquiry-throttle.guard';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  // The throttle guard is a provider so its in-memory window is one instance
  // shared by every request, not one per resolution.
  providers: [LeadsService, EnquiryThrottleGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
