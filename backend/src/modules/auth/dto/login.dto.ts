import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@maison.co' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Maison!2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
