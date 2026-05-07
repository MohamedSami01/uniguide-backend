import {
  IsString,
  MinLength,
  IsEmail,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass@123',
  })
  @IsString()
  @MinLength(8)
  password: string;
}