import { IsString, Matches, MaxLength } from 'class-validator';

/** Room names are constrained so a client cannot probe arbitrary namespaces. */
export class SubscribeDto {
  @IsString()
  @MaxLength(128)
  @Matches(/^(user|org|entity|topic):[A-Za-z0-9:_-]+$/, {
    message: 'room must look like user:<id>, org:<id>, entity:<type>:<id> or topic:<name>',
  })
  room!: string;
}
