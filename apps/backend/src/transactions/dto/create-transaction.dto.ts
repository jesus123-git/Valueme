import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionOwner } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ example: 'account-uuid-aqui' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: 'category-uuid-aqui', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType, example: 'INCOME' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ enum: TransactionOwner, example: 'BUSINESS' })
  @IsEnum(TransactionOwner)
  owner: TransactionOwner;

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Pago de factura #001', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Cliente pagó antes del vencimiento', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2026-06-07' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
