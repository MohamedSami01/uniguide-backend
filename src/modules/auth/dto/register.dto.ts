import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsEmail,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'Ahmed Hassan',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiProperty({
    example: 'student',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'Cairo',
    required: false,
  })
  @IsOptional()
  @IsString()
  governorate?: string;
}