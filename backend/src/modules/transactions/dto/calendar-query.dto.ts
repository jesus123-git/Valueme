import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({ example: 2026, description: 'Año (2000–2100)' })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Mes del 1 al 12' })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
