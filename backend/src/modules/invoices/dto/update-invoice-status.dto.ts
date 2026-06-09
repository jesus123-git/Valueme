import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: InvoiceStatus, example: 'PAID' })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}
