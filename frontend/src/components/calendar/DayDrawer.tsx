'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { CalendarDay } from '@/hooks/useCalendarData';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  amount: number | string;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  bankAccount: { id: string; name: string; currency: string };
  category: { id: string; name: string };
}

interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  totalIncome: number | string;
  totalExpense: number | string;
}

export interface DayDrawerProps {
  year:    number;
  month:   number;
  day:     number;
  /** Totales pre-calculados desde el calendario mensual (evita un fetch extra) */
  summary?: CalendarDay;
  onClose: () => void;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Calcula el rango UTC que corresponde a un día completo en hora Colombia (UTC-5).
 * Medianoche Colombia = 05:00 UTC. 23:59:59 Colombia = siguiente día 04:59:59 UTC.
 */
function getBogotaDayRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month - 1, day,     5,  0,  0,   0));
  const end   = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999));
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Formatea la hora de una transacción en hora Colombia */
function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DayDrawer({ year, month, day, summary, onClose }: DayDrawerProps) {
  const [txs,     setTxs]     = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Carga las transacciones del día
  const fetchDay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getBogotaDayRange(year, month, day);
      const result = await apiGet<PaginatedTransactions>(
        `/transactions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=100`,
      );
      // Mostrar cronológicamente (el backend devuelve desc)
      setTxs([...result.data].reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [year, month, day]);

  useEffect(() => { fetchDay(); }, [fetchDay]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll del body mientras el drawer está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const income  = summary?.income  ?? 0;
  const expense = summary?.expense ?? 0;
  const titleDate = `${day} de ${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label={`Movimientos del ${titleDate}`}>

      {/* ── Overlay semitransparente ───────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Panel deslizante ───────────────────────────────────────────── */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 h-full flex flex-col shadow-2xl animate-drawer-in overflow-hidden border-l border-slate-100 dark:border-slate-700">

        {/* Cabecera */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              Movimientos
            </p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {titleDate}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Cerrar panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pastillas de resumen */}
        {(income > 0 || expense > 0) && (
          <div className="flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            {income > 0 && (
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2.5 border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">
                  Ingresos
                </p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(income)}
                </p>
              </div>
            )}
            {expense > 0 && (
              <div className="flex-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl px-3 py-2.5 border border-rose-100 dark:border-rose-900/40">
                <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-0.5">
                  Gastos
                </p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-300">
                  {formatCurrency(expense)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lista de transacciones */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            /* Skeleton */
            <div className="p-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-3/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full w-1/2" />
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error */
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <span className="text-3xl mb-3 select-none" aria-hidden>⚠️</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
              <button
                onClick={fetchDay}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : txs.length === 0 ? (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <span className="text-4xl mb-3 select-none" aria-hidden>🗓️</span>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin movimientos</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                No se registraron transacciones este día
              </p>
            </div>
          ) : (
            /* Lista */
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {txs.map((tx) => {
                const isIncome   = tx.type === 'INCOME';
                const isExpense  = tx.type === 'EXPENSE';
                const isTransfer = tx.type === 'TRANSFER';

                return (
                  <li key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">

                    {/* Icono de tipo */}
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm',
                      isIncome   && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                      isExpense  && 'bg-rose-100 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400',
                      isTransfer && 'bg-blue-100 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400',
                    )} aria-hidden>
                      {isIncome ? '↑' : isExpense ? '↓' : '↔'}
                    </div>

                    {/* Descripción + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-snug">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-none truncate">
                        {tx.category.name}
                        <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                        {tx.bankAccount.name}
                        <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                        {formatTime(tx.date)}
                      </p>
                    </div>

                    {/* Monto */}
                    <span className={cn(
                      'text-sm font-bold flex-shrink-0',
                      isIncome   && 'text-emerald-600 dark:text-emerald-400',
                      isExpense  && 'text-rose-500 dark:text-rose-400',
                      isTransfer && 'text-blue-500 dark:text-blue-400',
                    )}>
                      {isIncome ? '+' : isExpense ? '−' : ''}
                      {formatCurrency(Number(tx.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer con contador */}
        {!loading && !error && txs.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {txs.length} movimiento{txs.length !== 1 ? 's' : ''} este día
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
