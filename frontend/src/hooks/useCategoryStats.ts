'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CategoryStatItem {
  categoryId:   string;
  categoryName: string;
  total:        number;
  count:        number;
  percentage:   number;
}

export interface CategoryStatsData {
  year:  number;
  month: number;
  items: CategoryStatItem[];
  total: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCategoryStats(year: number, month: number) {
  const [data,    setData]    = useState<CategoryStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<CategoryStatsData>(
        `/transactions/summary/categories?year=${year}&month=${month}`,
      );
      // Normalizar Decimal → number
      setData({
        ...result,
        total: Number(result.total),
        items: result.items.map((item) => ({
          ...item,
          total:      Number(item.total),
          percentage: Number(item.percentage),
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}
