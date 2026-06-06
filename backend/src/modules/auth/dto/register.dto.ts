import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Dirección de correo electrónico única del usuario',
  })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @ApiPropertyOptional({
    example: 'María García',
    description: 'Nombre para mostrar (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: 'MiClave.Segura1',
    description:
      'Contraseña: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;
}
