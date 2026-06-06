'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, removeToken } from '@/lib/api';
import { removeSessionCookie } from '@/lib/cookies';
import type {
  BalanceSummary,
  BankAccount,
  DashboardData,
  PaginatedTransactions,
  Transaction,
} from '@/types/dashboard.types';
import { TransactionType } from '@/types/api.enums';

// ─── Parámetros de una actualización optimista ────────────────────────────────
// Se generan en el hook de nueva transacción y se pasan a applyOptimistic().

export interface OptimisticTransaction {
  tempId: string;          // UUID temporal (prefijado con "temp_")
  transaction: Transaction;
  balanceDelta: number;    // cuánto cambia el saldo neto en COP
  incomeDelta: number;     // cuánto cambia totalIncome
  expenseDelta: number;    // cuánto cambia totalExpense
}

// ─── Interfaz del hook ────────────────────────────────────────────────────────

export interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Aplica un cambio optimista inmediato en la UI antes de la respuesta del server */
  applyOptimistic: (opt: OptimisticTransaction) => void;
  /** Revierte un cambio optimista (llamado si la petición falla) */
  revertOptimistic: (opt: OptimisticTransaction) => void;
  /** Sustituye la transacción temporal por la real del servidor */
  confirmOptimistic: (tempId: string, realTx: Transaction) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): UseDashboardResult {
  const router  = useRouter();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summary, accounts, txResponse] = await Promise.all([
        apiGet<BalanceSummary>('/bank-accounts/summary'),
        apiGet<BankAccount[]>('/bank-accounts'),
        apiGet<PaginatedTransactions>('/transactions?limit=10&page=1'),
      ]);

      setData({
        summary,
        accounts,
        recentTransactions: txResponse.data,
        totalIncome:  txResponse.totalIncome,
        totalExpense: txResponse.totalExpense,
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        removeToken();
        removeSessionCookie();
        router.push('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actualización optimista ───────────────────────────────────────────────
  // Modifica el estado local inmediatamente sin esperar al servidor.
  // Se llama justo ANTES de hacer el fetch real.

  const applyOptimistic = useCallback((opt: OptimisticTransaction) => {
    setData((prev) => {
      if (!prev) return prev;

      // 1. Prepend la transacción temporal a la lista (máx 10)
      const recentTransactions = [opt.transaction, ...prev.recentTransactions].slice(0, 10);

      // 2. Actualizar el saldo neto (summary.totalByCurrency.COP)
      const currency = opt.transaction.bankAccount.currency;
      const totalByCurrency = {
        ...prev.summary.totalByCurrency,
        [currency]: (prev.summary.totalByCurrency[currency] ?? 0) + opt.balanceDelta,
      };

      // 3. Actualizar el balance de la cuenta origen en la lista
      const accounts = prev.accounts.map((acc) => {
        if (acc.id !== opt.transaction.bankAccount.id) return acc;
        return { ...acc, balance: acc.balance + opt.balanceDelta };
      });

      return {
        ...prev,
        summary: { ...prev.summary, totalByCurrency },
        accounts,
        recentTransactions,
        totalIncome:  prev.totalIncome  + opt.incomeDelta,
        totalExpense: prev.totalExpense + opt.expenseDelta,
      };
    });
  }, []);

  // ── Revertir optimista ────────────────────────────────────────────────────
  // Deshace exactamente lo que hizo applyOptimistic.
  // Se llama si la petición al servidor falla.

  const revertOptimistic = useCallback((opt: OptimisticTransaction) => {
    setData((prev) => {
      if (!prev) return prev;

      const currency = opt.transaction.bankAccount.currency;
      const recentTransactions = prev.recentTransactions.filter(
        (tx) => tx.id !== opt.tempId,
      );
      const totalByCurrency = {
        ...prev.summary.totalByCurrency,
        [currency]: (prev.summary.totalByCurrency[currency] ?? 0) - opt.balanceDelta,
      };
      const accounts = prev.accounts.map((acc) => {
        if (acc.id !== opt.transaction.bankAccount.id) return acc;
        return { ...acc, balance: acc.balance - opt.balanceDelta };
      });

      return {
        ...prev,
        summary: { ...prev.summary, totalByCurrency },
        accounts,
        recentTransactions,
        totalIncome:  prev.totalIncome  - opt.incomeDelta,
        totalExpense: prev.totalExpense - opt.expenseDelta,
      };
    });
  }, []);

  // ── Confirmar optimista ───────────────────────────────────────────────────
  // Sustituye el ID temporal por el ID real que devolvió el servidor.
  // Garantiza que futuras operaciones (ej: borrar) usen el ID correcto.

  const confirmOptimistic = useCallback((tempId: string, realTx: Transaction) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recentTransactions: prev.recentTransactions.map((tx) =>
          tx.id === tempId ? realTx : tx,
        ),
      };
    });
  }, []);

  return {
    data, loading, error,
    refetch: fetchAll,
    applyOptimistic,
    revertOptimistic,
    confirmOptimistic,
  };
}

// ─── Helper: calcula los deltas de una transacción ────────────────────────────
// Centraliza la lógica de dirección de flujo para que sea idéntica
// al cálculo del backend (balanceDeltaForAccount en transactions.service.ts).

export function calcOptimisticDeltas(
  type: TransactionType,
  amount: number,
): { balanceDelta: number; incomeDelta: number; expenseDelta: number } {
  switch (type) {
    case TransactionType.INCOME:
      return { balanceDelta: +amount, incomeDelta: amount, expenseDelta: 0 };
    case TransactionType.EXPENSE:
      return { balanceDelta: -amount, incomeDelta: 0, expenseDelta: amount };
    case TransactionType.TRANSFER:
      // La cuenta origen pierde el monto; los totales de income/expense no cambian
      return { balanceDelta: -amount, incomeDelta: 0, expenseDelta: 0 };
  }
}
