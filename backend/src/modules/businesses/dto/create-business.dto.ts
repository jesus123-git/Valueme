import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Mi Empresa SAS' })
  @IsString()
  name: string;

  @ApiProperty({ example: '900123456-7', required: false })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiProperty({ example: 'Mi Empresa S.A.S.', required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ example: 'Calle 123 #45-67, Bogotá', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '+573001234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'contacto@miempresa.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'SIMPLE', enum: ['SIMPLE', 'ORDINARIO'], required: false })
  @IsOptional()
  @IsString()
  taxRegime?: string;
}
