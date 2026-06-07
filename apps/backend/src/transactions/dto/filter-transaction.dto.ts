import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class FilterTransactionDto {
  @ApiProperty({ enum: TransactionType, required: false })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({ example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ example: '2026-06-30', required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ example: 'category-uuid', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
