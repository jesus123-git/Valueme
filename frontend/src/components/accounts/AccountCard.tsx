'use client';

import { formatCurrency } from '@/lib/utils';
import { AccountType, type BankAccount } from '@/types/dashboard.types';

// ─── Config visual por tipo de cuenta ─────────────────────────────────────────

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { icon: string; label: string }> = {
  [AccountType.CHECKING]: { icon: '🏦', label: 'Corriente' },
  [AccountType.SAVINGS]:  { icon: '🏛️', label: 'Ahorros'   },
  [AccountType.CREDIT]:   { icon: '💳', label: 'Crédito'   },
  [AccountType.CASH]:     { icon: '💵', label: 'Efectivo'  },
};

// ─── Config visual por proveedor ──────────────────────────────────────────────

interface ProviderStyle {
  label:      string;
  pillBg:     string;     // clases Tailwind del badge
  pillText:   string;
  topBarBg:   string;     // franja superior de color
}

const PROVIDER_STYLE: Record<string, ProviderStyle> = {
  NEQUI: {
    label:    'Nequi',
    pillBg:   'bg-gradient-to-r from-pink-500 to-purple-600',
    pillText: 'text-white',
    topBarBg: 'bg-gradient-to-r from-pink-500 to-purple-600',
  },
  BANCOLOMBIA: {
    label:    'Bancolombia',
    pillBg:   'bg-gradient-to-r from-yellow-400 to-amber-500',
    pillText: 'text-white',
    topBarBg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  account:  BankAccount;
  selected: boolean;
  onClick:  (account: BankAccount) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AccountCard({ account, selected, onClick }: Props) {
  const typeConfig     = ACCOUNT_TYPE_CONFIG[account.type] ?? ACCOUNT_TYPE_CONFIG[AccountType.CHECKING];
  const providerKey    = account.provider?.toUpperCase() ?? '';
  const providerStyle  = PROVIDER_STYLE[providerKey] ?? null;
  const isNegative     = account.balance < 0;

  return (
    <button
      onClick={() => onClick(account)}
      aria-pressed={selected}
      className={`
        w-full text-left rounded-2xl border overflow-hidden
        transition-all duration-200 group
        focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
        ${selected
          ? 'border-emerald-400 shadow-md bg-white ring-1 ring-emerald-300'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
      `}
    >
      {/* Franja de color superior (solo si tiene proveedor conocido) */}
      {providerStyle && (
        <div className={`h-1.5 w-full ${providerStyle.topBarBg}`} />
      )}

      <div className="p-4">

        {/* ── Fila 1: icono + nombre + badge ──────────────────────────── */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Icono tipo + nombre */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl leading-none flex-shrink-0">{typeConfig.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                {account.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {typeConfig.label}
                {account.externalAccountId ? ` · ${account.externalAccountId}` : ''}
              </p>
            </div>
          </div>

          {/* Badge proveedor */}
          {providerStyle ? (
            <span className={`
              flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full leading-5
              ${providerStyle.pillBg} ${providerStyle.pillText}
            `}>
              {providerStyle.label}
            </span>
          ) : (
            // Badge genérico si no tiene proveedor
            <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full leading-5 bg-slate-100 text-slate-500">
              {typeConfig.label}
            </span>
          )}
        </div>

        {/* ── Fila 2: saldo ────────────────────────────────────────────── */}
        <div className="flex items-end justify-between">
          <p className="text-xs text-slate-400">Saldo actual</p>
          <div className="text-right">
            <p className={`text-lg font-bold tabular-nums leading-tight ${
              isNegative ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {formatCurrency(account.balance, account.currency)}
            </p>
            <p className="text-[10px] text-slate-400">{account.currency}</p>
          </div>
        </div>
      </div>

      {/* Indicador activo en la parte inferior */}
      {selected && (
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
      )}
    </button>
  );
}
