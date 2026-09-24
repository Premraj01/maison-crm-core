import { PartialType } from '@nestjs/swagger';

import { CreatePropertyDto } from './create-property.dto';

/**
 * Every field optional. `slug` stays editable, unlike a user's email, because
 * the website's URLs are the agent's to choose — the unique index still stops
 * two listings claiming the same one.
 */
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
