import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ─── Registro ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Verificar que el email no esté en uso
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('El email ya está registrado');

    // Hashear la contraseña (nunca guardar en texto plano)
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Crear usuario en BD
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Generar token JWT y retornar
    return {
      user,
      accessToken: this.generateToken(user.id, user.email),
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // Buscar usuario por email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Credenciales inválidas');

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: this.generateToken(user.id, user.email),
    };
  }

  // ─── Perfil del usuario actual ───────────────────────────────────────────────

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload);
  }
}
