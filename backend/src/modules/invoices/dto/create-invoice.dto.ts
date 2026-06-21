import { IsString, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ example: 'uuid-producto', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Desarrollo de sitio web' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 2500000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 19, description: 'IVA en porcentaje (0 o 19)' })
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'customer-uuid', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '2026-06-30', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 'Pago a 30 días desde la fecha de emisión', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
