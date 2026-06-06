import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Extendemos el guard genérico de Passport vinculado a la estrategia 'jwt'.
// Uso: @UseGuards(JwtAuthGuard) en cualquier controller o método.
// Si el token falta o es inválido, responde automáticamente con 401 Unauthorized.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
