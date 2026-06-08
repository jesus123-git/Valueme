import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Camiseta talla M' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Camiseta de algodón 100%', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductType, example: 'PRODUCT' })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ example: 'CAM-M-001', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 20000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ example: 19, description: 'IVA en porcentaje' })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiProperty({ example: 'unidad', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}
