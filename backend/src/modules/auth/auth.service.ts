import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// Número de rondas de sal para bcrypt.
// 10 es el estándar: suficientemente seguro y no bloquea el event loop.
// En producción podrías subir a 12, pero el hash tardaría ~250ms.
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
      );
    }
    return this.googleClient;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly categoriesService: CategoriesService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Registro ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // 1. Verificar que el email no esté en uso
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      // 409 Conflict — no revelamos si es un email válido (seguridad)
      throw new ConflictException('El email ya está registrado');
    }

    // 2. Hashear la contraseña — NUNCA guardamos texto plano
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3. Crear el usuario en la BD
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
      // select evita que el passwordHash salga en la respuesta
      select: {
        id: true, email: true, name: true, plan: true, isStaff: true,
        onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
      },
    });

    // 4. Crear las categorías por defecto en background.
    //    No usamos await para no bloquear la respuesta al cliente:
    //    si el seed fallara (situación muy improbable), el usuario
    //    ya fue creado correctamente y puede crear sus propias categorías.
    void this.categoriesService.seedDefaults(user.id);

    // 5. Emitir token inmediatamente (el usuario queda logueado al registrarse)
    return this.buildTokenResponse(user);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // 1. Buscar al usuario (incluimos passwordHash solo aquí, en el servicio)
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true, email: true, name: true, plan: true, passwordHash: true, isStaff: true,
        onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
      },
    });

    // 2. Verificar contraseña con tiempo constante (bcrypt.compare evita timing attacks)
    const passwordValid =
      user !== null &&
      user.passwordHash !== null &&
      (await bcrypt.compare(dto.password, user.passwordHash));

    if (!passwordValid) {
      // Mensaje genérico: no indicamos si el email existe o no
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildTokenResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      isStaff: user.isStaff,
      onboardingCompletedAt: user.onboardingCompletedAt,
      modulePreference: user.modulePreference,
      primaryCurrency: user.primaryCurrency,
    });
  }

  // ─── Login con Google (flujo ID token) ─────────────────────────────────────

  async googleLogin(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    let payload;
    try {
      const ticket = await this.getGoogleClient().verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name ?? null;

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, plan: true, isStaff: true, googleId: true,
        onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
      },
    });

    if (existing) {
      if (!existing.googleId) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { googleId },
        });
      }
      return this.buildTokenResponse({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        plan: existing.plan,
        isStaff: existing.isStaff,
        onboardingCompletedAt: existing.onboardingCompletedAt,
        modulePreference: existing.modulePreference,
        primaryCurrency: existing.primaryCurrency,
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        googleId,
      },
      select: {
        id: true, email: true, name: true, plan: true, isStaff: true,
        onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
      },
    });

    void this.categoriesService.seedDefaults(user.id);

    return this.buildTokenResponse(user);
  }

  // ─── Actualizar perfil ────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: { name?: string; email?: string }) {
    // Si cambia el email verificamos que no esté en uso
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('El email ya está en uso');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.name !== undefined && { name: dto.name }), ...(dto.email && { email: dto.email }) },
      select: { id: true, email: true, name: true },
    });

    return updated;
  }

  // ─── Cambiar contraseña ───────────────────────────────────────────────────

  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Tu cuenta usa acceso con Google. Aún no tiene contraseña.',
      );
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ─── Onboarding y preferencias ────────────────────────────────────────────

  // Campos que el frontend necesita del usuario tras cualquier cambio de perfil/preferencias
  private readonly userSelect = {
    id: true, email: true, name: true, plan: true, isStaff: true,
    onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
  } as const;

  async completeOnboarding(
    userId: string,
    dto: { name?: string; modulePreference: import('@prisma/client').ModulePreference; primaryCurrency: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        modulePreference: dto.modulePreference,
        primaryCurrency: dto.primaryCurrency,
        onboardingCompletedAt: new Date(),
      },
      select: this.userSelect,
    });
  }

  async updatePreferences(
    userId: string,
    dto: {
      name?: string;
      modulePreference?: import('@prisma/client').ModulePreference;
      primaryCurrency?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.modulePreference !== undefined && { modulePreference: dto.modulePreference }),
        ...(dto.primaryCurrency !== undefined && { primaryCurrency: dto.primaryCurrency }),
      },
      select: this.userSelect,
    });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private buildTokenResponse(user: {
    id: string;
    email: string;
    name: string | null;
    plan: import('@prisma/client').PlanType;
    isStaff: boolean;
    onboardingCompletedAt: Date | null;
    modulePreference: import('@prisma/client').ModulePreference;
    primaryCurrency: string;
  }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isStaff: user.isStaff,
        onboardingCompletedAt: user.onboardingCompletedAt,
        modulePreference: user.modulePreference,
        primaryCurrency: user.primaryCurrency,
      },
    };
  }
}
