'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { PaginatedTransactions } from '@/types/dashboard.types';

// ─── Constante ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Carga las transacciones de UNA cuenta específica, ordenadas de la más
// reciente a la más antigua (el backend ya las ordena por date DESC).
//
// Cuando accountId cambia (o es null), el hook limpia el estado anterior
// y vuelve a cargar. Esto garantiza que el panel de movimientos siempre
// refleje la cuenta seleccionada.
//
// El caller debe pasar refetch() al BankSimulatorPanel.onSuccess para que
// el historial se actualice tras cada simulación.

export function useAccountTransactions(accountId: string | null) {
  const [data,    setData]    = useState<PaginatedTransactions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!accountId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiGet<PaginatedTransactions>(
        `/transactions?bankAccountId=${encodeURIComponent(accountId)}&page=1&limit=${PAGE_SIZE}`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return { data, loading, error, refetch: fetchTransactions };
}
