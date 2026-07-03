import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModulePreference } from '@prisma/client';

export class PreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ModulePreference })
  @IsOptional()
  @IsEnum(ModulePreference)
  modulePreference?: ModulePreference;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  primaryCurrency?: string;
}
