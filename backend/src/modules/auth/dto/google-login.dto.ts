import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token (credential) devuelto por Google Identity Services',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
