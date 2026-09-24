import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * What the PUBLIC website form may send. Deliberately narrower than
 * `CreateLeadDto`: an anonymous visitor cannot set a stage, a value, an owner
 * or an organisation, so no amount of crafting a request can plant a lead
 * halfway down someone's pipeline or assign it to an agent.
 *
 * The listing is named by its public slug, which is the only identifier the
 * website has for it.
 */
export class CreateEnquiryDto {
  @ApiProperty({ example: 'Priya Shah' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+1 310 555 0142' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'Could I see it on Saturday morning?' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ example: 'Booking a viewing' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  interest?: string;

  /** The listing being enquired about; omitted for a general enquiry. */
  @ApiPropertyOptional({ example: 'casa-solana' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  propertySlug?: string;
}
