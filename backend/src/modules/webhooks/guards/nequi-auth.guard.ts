import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard de autenticación para el webhook de Nequi.
 *
 * En lugar del JWT del usuario, verifica el header `X-Nequi-Auth`
 * contra la variable de entorno `NEQUI_WEBHOOK_SECRET`.
 *
 * En un webhook real esto sería:
 *   - HMAC-SHA256 del body (ej: Stripe, GitHub)
 *   - Token Bearer en Authorization (ej: Twilio)
 *
 * Para esta simulación usamos un simple API Key compartido.
 */
@Injectable()
export class NequiAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req      = ctx.switchToHttp().getRequest<Request>();
    const expected = this.config.get<string>('NEQUI_WEBHOOK_SECRET');
    const provided  = req.headers['x-nequi-auth'];

    if (!expected) {
      throw new UnauthorizedException(
        'NEQUI_WEBHOOK_SECRET no está configurado en el servidor',
      );
    }
    if (!provided || provided !== expected) {
      throw new UnauthorizedException(
        'X-Nequi-Auth inválido o ausente',
      );
    }
    return true;
  }
}
