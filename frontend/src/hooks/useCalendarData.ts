'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CalendarDay {
  income:  number;
  expense: number;
  count:   number;
}

export interface CalendarData {
  year:  number;
  month: number;
  // Clave = número de día como string ("1", "15", etc.)
  days:  Record<string, CalendarDay>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCalendarData(year: number, month: number) {
  const [data,    setData]    = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<CalendarData>(
        `/transactions/calendar?year=${year}&month=${month}`,
      );
      // El backend devuelve los amounts como strings de Decimal → normalizamos a number
      const normalizedDays: Record<string, CalendarDay> = {};
      for (const [k, v] of Object.entries(result.days)) {
        normalizedDays[k] = {
          income:  Number(v.income),
          expense: Number(v.expense),
          count:   v.count,
        };
      }
      setData({ ...result, days: normalizedDays });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  return { data, loading, error, refetch: fetchCalendar };
}
