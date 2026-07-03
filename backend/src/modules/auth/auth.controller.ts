import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateProfileDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
}

class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(6) newPassword: string;
}
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
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { OnboardingDto } from './dto/onboarding.dto';
import { PreferencesDto } from './dto/preferences.dto';

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

  // ─── POST /api/v1/auth/google ─────────────────────────────────────────────

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // mismo límite que login
  @ApiOperation({ summary: 'Iniciar sesión o registrarse con Google (ID token)' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Login con Google exitoso, token JWT emitido' })
  @ApiUnauthorizedResponse({ description: 'Token de Google inválido' })
  google(@Body() dto: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.authService.googleLogin(dto.idToken);
  }

  // ─── GET /api/v1/auth/me ──────────────────────────────────────────────────
  // Ruta de ejemplo que demuestra cómo usar @UseGuards + @CurrentUser

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Datos del usuario autenticado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  getProfile(@CurrentUser() user: { id: string; email: string; name: string | null; plan: string }) {
    return user;
  }

  // ─── PATCH /api/v1/auth/profile ───────────────────────────────────────────

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar nombre o email del perfil' })
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  // ─── PATCH /api/v1/auth/password ──────────────────────────────────────────

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  // ─── PATCH /api/v1/auth/onboarding ────────────────────────────────────────

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar el onboarding inicial del usuario' })
  completeOnboarding(
    @CurrentUser() user: { id: string },
    @Body() dto: OnboardingDto,
  ) {
    return this.authService.completeOnboarding(user.id, dto);
  }

  // ─── PATCH /api/v1/auth/preferences ───────────────────────────────────────

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar preferencias (módulo, moneda, nombre)' })
  updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: PreferencesDto,
  ) {
    return this.authService.updatePreferences(user.id, dto);
  }
}
