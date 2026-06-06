import { TransactionType } from '@prisma/client';

/**
 * Calcula cuánto debe incrementarse (o decrementarse) el balance de una cuenta
 * dado el tipo de transacción y si la cuenta es origen o destino.
 *
 * Centralizado aquí para que TransactionsService y WebhooksService sean
 * exactamente consistentes — una sola fuente de verdad.
 */
export function balanceDeltaForAccount(
  type: TransactionType,
  amount: number,
  isOrigin: boolean,
): number {
  switch (type) {
    case TransactionType.INCOME:
      return +amount;
    case TransactionType.EXPENSE:
      return -amount;
    case TransactionType.TRANSFER:
      return isOrigin ? -amount : +amount;
    default:
      throw new Error(`Tipo de transacción no reconocido: ${type as string}`);
  }
}
