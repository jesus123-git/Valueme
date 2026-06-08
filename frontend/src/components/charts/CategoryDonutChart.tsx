'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useCategoryStats } from '@/hooks/useCategoryStats';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Paleta de colores para hasta 10 categorías — funciona en modo claro y oscuro */
const PALETTE = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#a78bfa', // violet-400
];

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const color  = (entry.payload as { color: string }).color ?? '#6b7280';
  return (
    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-slate-800 dark:text-slate-100">{entry.name}</span>
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium">
        {formatCurrency(entry.value as number)}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
        {(entry.payload as { percentage: number }).percentage.toFixed(1)} % del total
      </p>
    </div>
  );
}

// ─── Props públicas ───────────────────────────────────────────────────────────

interface CategoryDonutChartProps {
  refreshSignal?: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CategoryDonutChart({ refreshSignal }: CategoryDonutChartProps) {
  const todayDate = new Date();
  const [viewYear,  setViewYear]  = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth() + 1);

  const { data, loading, error, refetch } = useCategoryStats(viewYear, viewMonth);

  // Re-fetch cuando llega un nuevo webhook
  useEffect(() => {
    if (refreshSignal !== undefined && refreshSignal > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // ── Navegación de mes ──────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    setViewMonth(m => {
      if (m === 1) { setViewYear(y => y - 1); return 12; }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setViewMonth(m => {
      if (m === 12) { setViewYear(y => y + 1); return 1; }
      return m + 1;
    });
  }, []);

  const isCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth() + 1;

  // ── Datos para recharts ────────────────────────────────────────────────────
  const chartData = (data?.items ?? []).map((item, i) => ({
    name:       item.categoryName,
    value:      item.total,
    percentage: item.percentage,
    color:      PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="flex flex-col h-full">

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Mes anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 w-[160px] text-center select-none">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h2>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Mes siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              onClick={() => { setViewYear(todayDate.getFullYear()); setViewMonth(todayDate.getMonth() + 1); }}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              Hoy
            </button>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
            aria-label="Actualizar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-4 w-4', loading && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      {loading ? (
        <DonutSkeleton />
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <span className="text-2xl mb-2" aria-hidden>⚠️</span>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">No se pudieron cargar los datos</p>
          <button onClick={refetch} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Reintentar
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <span className="text-4xl mb-3 select-none" aria-hidden>📊</span>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin gastos registrados</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            No hay movimientos de gasto en {MONTH_NAMES[viewMonth - 1].toLowerCase()} {viewYear}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">

          {/* Gráfica de dona con label central */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  dataKey="value"
                  strokeWidth={0}
                  animationBegin={0}
                  animationDuration={600}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Texto central: total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Gastos
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight mt-0.5">
                {formatCurrency(data.total)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {data.items.reduce((s, i) => s + i.count, 0)} movimientos
              </span>
            </div>
          </div>

          {/* Leyenda: lista de categorías ─────────────────────────────── */}
          <ul className="mt-2 space-y-1 overflow-y-auto flex-1 max-h-[160px] pr-1">
            {data.items.map((item, i) => (
              <li
                key={item.categoryId}
                className="flex items-center justify-between text-sm group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    aria-hidden
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {item.categoryName}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0 ml-2 tabular-nums">
                  {formatCurrency(item.total)}
                </span>
              </li>
            ))}
          </ul>

        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DonutSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center gap-4">
      {/* Círculo */}
      <div className="w-[160px] h-[160px] rounded-full border-[24px] border-slate-100 dark:border-slate-700 animate-pulse mt-4" />
      {/* Filas de leyenda */}
      <div className="w-full space-y-2.5 px-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-24" />
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
