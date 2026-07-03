import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModulePreference } from '@prisma/client';

export class OnboardingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ enum: ModulePreference })
  @IsEnum(ModulePreference)
  modulePreference: ModulePreference;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(8)
  primaryCurrency: string;
}
