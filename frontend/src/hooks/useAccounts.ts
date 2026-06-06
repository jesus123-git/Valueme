'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, removeToken } from '@/lib/api';
import { removeSessionCookie } from '@/lib/cookies';
import type { BankAccount } from '@/types/dashboard.types';

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Carga y refresca la lista de cuentas del usuario autenticado.
// Maneja 401 igual que useDashboard: limpia token y redirige a /login.

export function useAccounts() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<BankAccount[]>('/bank-accounts');
      setAccounts(data);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        removeToken();
        removeSessionCookie();
        router.push('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}
