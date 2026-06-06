import { ApiProperty } from '@nestjs/swagger';

// Este DTO solo sirve para documentar la respuesta en Swagger.
// No se usa para validar entrada, sino para describir la salida.
export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({
    example: {
      id: 'uuid-aqui',
      email: 'usuario@ejemplo.com',
      name: 'María García',
    },
  })
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}
