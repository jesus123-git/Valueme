'use client';

import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  TransactionType,
  type BankAccount,
  type PaginatedTransactions,
  type Transaction,
} from '@/types/dashboard.types';
import { SkeletonRow } from '@/components/dashboard/SkeletonCard';

// ─── Config visual por tipo de transacción ────────────────────────────────────

const TX_CONFIG: Record<TransactionType, {
  sign:      string;
  amountCls: string;
  iconBg:    string;
  iconText:  string;
  icon:      string;
  label:     string;
}> = {
  [TransactionType.INCOME]: {
    sign:      '+',
    amountCls: 'text-emerald-600 font-bold',
    iconBg:    'bg-emerald-100',
    iconText:  'text-emerald-600',
    icon:      '↑',
    label:     'Ingreso',
  },
  [TransactionType.EXPENSE]: {
    sign:      '−',
    amountCls: 'text-rose-600 font-bold',
    iconBg:    'bg-rose-100',
    iconText:  'text-rose-600',
    icon:      '↓',
    label:     'Gasto',
  },
  [TransactionType.TRANSFER]: {
    sign:      '⇄',
    amountCls: 'text-slate-700 font-semibold',
    iconBg:    'bg-slate-100',
    iconText:  'text-slate-500',
    icon:      '⇄',
    label:     'Transferencia',
  },
};

// ─── Config del header por proveedor ──────────────────────────────────────────

interface ProviderHeader {
  gradient:   string;   // clases Tailwind del fondo
  label:      string;   // nombre legible
  shortLabel: string;   // inicial para el avatar
}

const PROVIDER_HEADER: Record<string, ProviderHeader> = {
  NEQUI: {
    gradient:   'from-pink-500 to-purple-600',
    label:      'Nequi',
    shortLabel: 'N',
  },
  BANCOLOMBIA: {
    gradient:   'from-yellow-500 to-amber-600',
    label:      'Bancolombia',
    shortLabel: 'B',
  },
};

const DEFAULT_HEADER: ProviderHeader = {
  gradient:   'from-slate-600 to-slate-800',
  label:      '',
  shortLabel: '#',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  account:  BankAccount;
  data:     PaginatedTransactions | null;
  loading:  boolean;
  error:    string | null;
  /** Permite cerrar el panel en mobile con un botón "←" */
  onClose?: () => void;
  onRetry:  () => void;
}

// ─── Fila de movimiento individual ────────────────────────────────────────────

function MovementRow({ tx }: { tx: Transaction }) {
  const cfg = TX_CONFIG[tx.type];

  return (
    <li className="flex items-center gap-3 py-3.5 hover:bg-slate-50 rounded-xl px-2 -mx-2 transition-colors cursor-default group">
      {/* Icono de tipo */}
      <span className={`
        w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
        ${cfg.iconBg} ${cfg.iconText}
      `}
        title={cfg.label}
      >
        {cfg.icon}
      </span>

      {/* Descripción + metadatos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 leading-tight truncate">
          {tx.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md leading-none">
            {tx.category.name}
          </span>
          <span className="text-slate-200 text-xs">·</span>
          <span className="text-xs text-slate-400">
            {formatDateTime(tx.date)}
          </span>
        </div>
      </div>

      {/* Monto con signo y color */}
      <p className={`text-sm tabular-nums flex-shrink-0 ${cfg.amountCls}`}>
        {cfg.sign}&nbsp;{formatCurrency(tx.amount, tx.bankAccount.currency)}
      </p>
    </li>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AccountMovementsPanel({
  account, data, loading, error, onClose, onRetry,
}: Props) {
  const providerKey = account.provider?.toUpperCase() ?? '';
  const ph          = PROVIDER_HEADER[providerKey] ?? DEFAULT_HEADER;
  const isNegative  = account.balance < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

      {/* ── Header con gradiente de proveedor ──────────────────────────────── */}
      <div className={`bg-gradient-to-r ${ph.gradient} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            {/* Botón "← Volver" en mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
                aria-label="Cerrar movimientos"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Avatar inicial del proveedor */}
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner">
              {ph.shortLabel}
            </div>

            {/* Nombre + subtitle */}
            <div className="min-w-0">
              <p className="font-bold text-white text-base leading-tight truncate">
                {account.name}
              </p>
              <p className="text-white/70 text-xs mt-0.5 truncate">
                {ph.label && `${ph.label} · `}
                {account.externalAccountId ?? account.type}
                {' · '}{account.currency}
              </p>
            </div>
          </div>

          {/* Saldo actual */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-white/60 mb-0.5 uppercase tracking-wide">Saldo</p>
            <p className={`text-2xl font-bold tabular-nums leading-tight ${
              isNegative ? 'text-rose-200' : 'text-white'
            }`}>
              {formatCurrency(account.balance, account.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Barra de resumen ingreso/gasto ─────────────────────────────────── */}
      {data && !loading && (
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
          <div className="px-5 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 flex-shrink-0">
              ↑
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none mb-0.5">Ingresos</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums">
                +{formatCurrency(data.totalIncome, account.currency)}
              </p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600 flex-shrink-0">
              ↓
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none mb-0.5">Gastos</p>
              <p className="text-sm font-bold text-rose-600 tabular-nums">
                −{formatCurrency(data.totalExpense, account.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de movimientos ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ minHeight: '280px', maxHeight: '520px' }}
      >
        {/* ── Estado: cargando ──────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-0.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {/* ── Estado: error ─────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              onClick={onRetry}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Estado: vacío ─────────────────────────────────────────────── */}
        {!loading && !error && data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-2.5">
            <span className="text-4xl">📭</span>
            <p className="text-sm font-medium text-slate-600">Sin movimientos aún</p>
            <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
              Los movimientos del simulador aparecerán aquí al instante. Prueba los botones de abajo.
            </p>
          </div>
        )}

        {/* ── Lista de transacciones ────────────────────────────────────── */}
        {!loading && !error && data && data.data.length > 0 && (
          <>
            {/* Encabezado de sección */}
            <div className="flex items-center justify-between mb-1 pb-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Movimientos
              </p>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {data.total} total{data.total !== 1 ? 'es' : ''}
              </span>
            </div>

            <ul className="divide-y divide-slate-50">
              {data.data.map((tx) => (
                <MovementRow key={tx.id} tx={tx} />
              ))}
            </ul>

            {/* Nota de paginación si hay más registros */}
            {data.totalPages > 1 && (
              <p className="text-center text-xs text-slate-400 pt-4 pb-1 border-t border-slate-100 mt-3">
                Mostrando los últimos {data.data.length} de {data.total} movimientos
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
