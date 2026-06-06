import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email registrado',
  })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @ApiProperty({
    example: 'MiClave.Segura1',
    description: 'Contraseña del usuario',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
