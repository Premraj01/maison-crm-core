import { PartialType } from '@nestjs/swagger';

import { CreateLeadDto } from './create-lead.dto';

/** Every field optional — moving a pipeline card is a PATCH of `stage` alone. */
export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
