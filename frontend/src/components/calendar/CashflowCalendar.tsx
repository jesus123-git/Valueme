'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCalendarData } from '@/hooks/useCalendarData';
import { DayDrawer } from './DayDrawer';
import { cn } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

const WEEKDAYS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Formato compacto para montos dentro de las celdas del calendario */
function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
}

interface SelectedDay {
  year:  number;
  month: number;
  day:   number;
}

// ─── Props públicas ───────────────────────────────────────────────────────────

interface CashflowCalendarProps {
  /** Incrementar para forzar un re-fetch (útil cuando llega un nuevo webhook) */
  refreshSignal?: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CashflowCalendar({ refreshSignal }: CashflowCalendarProps) {
  // Estado de navegación de mes
  const todayDate = new Date();
  const [viewYear,  setViewYear]  = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth() + 1); // 1-indexed
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const { data, loading, error, refetch } = useCalendarData(viewYear, viewMonth);

  // Cuando llega un refreshSignal externo, re-cargamos el mes actual
  useEffect(() => {
    if (refreshSignal !== undefined && refreshSignal > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // ── Navegación ─────────────────────────────────────────────────────────────
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

  const goToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  }, []);

  // ── Construir grilla del calendario ────────────────────────────────────────
  // JavaScript: 0=Dom, 1=Lun … Convertimos a Lun-first: Lun=0 … Dom=6
  const firstDayJS    = new Date(viewYear, viewMonth - 1, 1).getDay();
  const startOffset   = firstDayJS === 0 ? 6 : firstDayJS - 1;
  const daysInMonth   = new Date(viewYear, viewMonth, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Completar la última semana con celdas vacías
  const trailing = (7 - (cells.length % 7)) % 7;
  const allCells: (number | null)[] = [...cells, ...Array(trailing).fill(null)];

  const isToday = (day: number) =>
    day === todayDate.getDate() &&
    viewMonth === todayDate.getMonth() + 1 &&
    viewYear === todayDate.getFullYear();

  const isCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth() + 1;

  return (
    <>
      <div className="flex flex-col h-full">

        {/* ── Cabecera: navegación y título ────────────────────────────── */}
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
            {/* Botón "Hoy" — solo visible cuando no estamos en el mes actual */}
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                Hoy
              </button>
            )}
            {/* Botón refresh */}
            <button
              onClick={refetch}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
              aria-label="Actualizar calendario"
              title="Actualizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-4 w-4', loading && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Cabecera de días de la semana ────────────────────────────── */}
        <div className="grid grid-cols-7 mb-1.5">
          {WEEKDAYS.map(d => (
            <div
              key={d}
              className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1 select-none"
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── Grilla ───────────────────────────────────────────────────── */}
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <span className="text-2xl mb-2" aria-hidden>⚠️</span>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
              No se pudo cargar el calendario
            </p>
            <button
              onClick={refetch}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <CalendarSkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-[3px]">
            {allCells.map((day, idx) => {

              // Celda vacía de relleno
              if (!day) {
                return (
                  <div
                    key={`pad-${idx}`}
                    className="min-h-[68px] rounded-lg"
                    aria-hidden
                  />
                );
              }

              const dayData    = data?.days[day.toString()];
              const hasIncome  = !!dayData && dayData.income  > 0;
              const hasExpense = !!dayData && dayData.expense > 0;
              const hasAny     = hasIncome || hasExpense;
              const todayFlag  = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay({ year: viewYear, month: viewMonth, day })}
                  className={cn(
                    'min-h-[68px] p-1.5 rounded-lg text-left flex flex-col gap-0.5 transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                    // Base: solo hover sutil
                    'hover:bg-slate-100 dark:hover:bg-slate-700/50',
                    // Con actividad: fondo levemente marcado
                    hasAny && 'bg-slate-50 dark:bg-slate-700/20',
                    // Día de hoy: anillo esmeralda
                    todayFlag && 'ring-2 ring-inset ring-emerald-500 dark:ring-emerald-400',
                  )}
                  aria-label={`${day} de ${MONTH_NAMES[viewMonth - 1]}${hasAny ? `, ${dayData!.count} movimiento${dayData!.count !== 1 ? 's' : ''}` : ''}`}
                >
                  {/* Número del día */}
                  <span className={cn(
                    'text-[13px] font-bold leading-none',
                    todayFlag
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300',
                  )}>
                    {day}
                  </span>

                  {/* Ingreso */}
                  {hasIncome && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                      +{formatCompact(dayData!.income)}
                    </span>
                  )}

                  {/* Gasto */}
                  {hasExpense && (
                    <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 leading-tight">
                      −{formatCompact(dayData!.expense)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Leyenda ──────────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-end gap-4 text-[10px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Ingresos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            Gastos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full ring-2 ring-emerald-500 inline-block" />
            Hoy
          </span>
        </div>
      </div>

      {/* ── DayDrawer (fuera del flujo normal, fixed) ─────────────────── */}
      {selectedDay && (
        <DayDrawer
          year={selectedDay.year}
          month={selectedDay.month}
          day={selectedDay.day}
          summary={data?.days[selectedDay.day.toString()]}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-[3px]">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[68px] rounded-lg bg-slate-100 dark:bg-slate-700/30 animate-pulse"
        />
      ))}
    </div>
  );
}
