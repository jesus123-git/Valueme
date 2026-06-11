import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService }    from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { SaveEmailConfigDto } from './dto/save-email-config.dto';

@Injectable()
export class EmailConfigService {
  constructor(
    private readonly prisma:      PrismaService,
    private readonly encryption:  EncryptionService,
  ) {}

  async save(userId: string, dto: SaveEmailConfigDto) {
    const encryptedPassword = this.encryption.encrypt(dto.emailPassword);
    return this.prisma.emailIntegration.upsert({
      where:  { userId },
      update: {
        emailUser:     dto.emailUser,
        emailPassword: encryptedPassword,
        emailHost:     dto.emailHost     ?? 'imap.gmail.com',
        emailPort:     dto.emailPort     ?? 993,
        emailMailbox:  dto.emailMailbox  ?? 'INBOX',
      },
      create: {
        userId,
        emailUser:     dto.emailUser,
        emailPassword: encryptedPassword,
        emailHost:     dto.emailHost     ?? 'imap.gmail.com',
        emailPort:     dto.emailPort     ?? 993,
        emailMailbox:  dto.emailMailbox  ?? 'INBOX',
      },
      select: { id: true, emailUser: true, emailHost: true, emailPort: true, emailMailbox: true },
    });
  }

  async get(userId: string) {
    return this.prisma.emailIntegration.findUnique({
      where:  { userId },
      select: { id: true, emailUser: true, emailHost: true, emailPort: true, emailMailbox: true },
    });
  }

  async remove(userId: string) {
    const existing = await this.prisma.emailIntegration.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('No hay configuración de correo para este usuario');
    await this.prisma.emailIntegration.delete({ where: { userId } });
  }
}
