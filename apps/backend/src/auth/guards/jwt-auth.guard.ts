import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Usar este guard en cualquier endpoint que requiera estar autenticado:
// @UseGuards(JwtAuthGuard)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
