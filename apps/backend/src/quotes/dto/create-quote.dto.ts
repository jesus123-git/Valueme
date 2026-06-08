import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsUUID, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuoteItemDto {
  @ApiProperty({ example: 'product-uuid', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 'Desarrollo de sitio web' })
  @IsString()
  description: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 19 })
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class CreateQuoteDto {
  @ApiProperty({ example: 'customer-uuid', required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ example: '2026-07-31', required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ example: 'Válido por 30 días', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}
