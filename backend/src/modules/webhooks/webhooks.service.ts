import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { NequiWebhookPayloadDto } from './dto/nequi-webhook-payload.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  async handleNequi(payload: NequiWebhookPayloadDto) {
    // ── 1. Resolver la cuenta ────────────────────────────────────────────────
    // Buscamos la cuenta cuyo provider sea 'NEQUI' y cuyo externalAccountId
    // coincida con el número de teléfono del payload.
    // En un sistema real también verificaríamos que el transactionId no se haya
    // procesado antes (idempotencia), pero para la simulación lo omitimos.

    const account = await this.prisma.bankAccount.findFirst({
      where: {
        provider:          'NEQUI',
        externalAccountId: payload.phoneNumber,
      },
      select: { id: true, userId: true, name: true },
    });

    if (!account) {
      throw new NotFoundException(
        `No se encontró ninguna cuenta Nequi asociada al número ${payload.phoneNumber}. ` +
        `Crea una cuenta con provider = 'NEQUI' y externalAccountId = '${payload.phoneNumber}'.`,
      );
    }

    // ── 2. Obtener (o crear) la categoría "Nequi" del usuario ────────────────
    // upsert con skipDuplicates garantiza idempotencia:
    // si ya existe la categoría la reutilizamos sin error.

    const category = await this.prisma.category.upsert({
      where: {
        name_userId: { name: 'Nequi', userId: account.userId },
      },
      create: { name: 'Nequi', userId: account.userId },
      update: {},  // no actualizar si ya existe
    });

    // ── 3. Crear la transacción y actualizar el balance (atómico) ────────────
    // Delegamos en TransactionsService.createForWebhook para no duplicar la
    // lógica de Prisma.$transaction + balanceDelta.

    const transaction = await this.transactions.createForWebhook({
      bankAccountId: account.id,
      categoryId:    category.id,
      userId:        account.userId,
      amount:        payload.amount,
      type:          payload.type,
      description:   payload.description,
      date:          new Date(payload.timestamp),
    });

    return {
      ok:          true,
      accountName: account.name,
      transaction,
    };
  }
}
