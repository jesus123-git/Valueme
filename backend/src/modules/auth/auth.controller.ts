import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')  // Agrupa los endpoints bajo "Auth" en Swagger
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /api/v1/auth/register ───────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // máx 5 registros / min por IP
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Usuario creado y token emitido' })
  @ApiConflictResponse({ description: 'El email ya está registrado' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  // ─── POST /api/v1/auth/login ──────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // máx 5 intentos / min por IP — anti fuerza bruta
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Login exitoso, token JWT emitido' })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  // ─── GET /api/v1/auth/me ──────────────────────────────────────────────────
  // Ruta de ejemplo que demuestra cómo usar @UseGuards + @CurrentUser

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()  // Indica en Swagger que este endpoint requiere token
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Datos del usuario autenticado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  getProfile(@CurrentUser() user: { id: string; email: string; name: string | null }) {
    return user;
  }
}
