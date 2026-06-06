import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class NequiWebhookPayloadDto {
  @ApiProperty({
    example: '3123456789',
    description: 'Número de teléfono Nequi de 10 dígitos (sin indicativo)',
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber debe ser exactamente 10 dígitos' })
  phoneNumber: string;

  @ApiProperty({ example: 50000, description: 'Monto en la moneda de la cuenta (siempre positivo)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

  @ApiProperty({
    enum: ['INCOME', 'EXPENSE'],
    description: 'INCOME = dinero que entra / EXPENSE = dinero que sale',
  })
  @IsEnum(
    ['INCOME', 'EXPENSE'],
    { message: 'type debe ser INCOME o EXPENSE (TRANSFER no aplica a webhooks)' },
  )
  // Prisma genera TransactionType como objeto const — usamos Extract para el tipo.
  type: Extract<TransactionType, 'INCOME' | 'EXPENSE'>;

  @ApiProperty({ example: 'Transferencia recibida de Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @ApiProperty({ example: '2026-06-06T13:00:00Z', description: 'Fecha y hora ISO 8601 del evento' })
  @IsISO8601({}, { message: 'timestamp debe ser una fecha ISO 8601 válida' })
  timestamp: string;

  @ApiProperty({ example: 'TRX-NEQUI-99812', description: 'ID único de la transacción en Nequi' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
