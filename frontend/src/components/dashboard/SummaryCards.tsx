import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { DashboardData } from '@/types/dashboard.types';

interface Props {
  data: DashboardData;
}

// ─── SummaryCards — lenguaje visual ValueMe ───────────────────────────────────
//
// Una sola tarjeta héroe en teal profundo (la firma de la marca) y métricas
// sobre superficie monocroma con borde fino. El color se usa con intención:
// solo el indicador de dirección lleva color, nunca la tarjeta entera.

export function SummaryCards({ data }: Props) {
  // Multimoneda: agrupar saldos por divisa. La moneda principal (COP si existe,
  // si no la primera) se muestra grande; las demás en filas compactas debajo.
  const byCurrency = Object.entries(data.summary.totalByCurrency ?? {});
  const sorted = byCurrency.sort(([a], [b]) =>
    a === 'COP' ? -1 : b === 'COP' ? 1 : a.localeCompare(b));
  const [main, ...others] = sorted.length ? sorted : [['COP', 0] as [string, number]];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      {/* ── Saldo total — tarjeta héroe ValueMe ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white">
        {/* Glow decorativo sutil */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" aria-hidden />

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Wallet size={17} className="text-white" />
          </div>
          <p className="text-sm font-medium text-white/80">Saldo neto total</p>
        </div>

        <p className="font-display text-3xl font-bold tracking-tight tabular-nums">
          {formatCurrency(main[1], main[0])}
        </p>

        {/* Saldos en otras monedas (cuentas en USD, MXN, etc.) */}
        {others.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {others.map(([code, total]) => (
              <p key={code} className="text-white/80 text-sm font-semibold tabular-nums">
                {formatCurrency(total, code)} <span className="text-white/50 text-xs">{code}</span>
              </p>
            ))}
          </div>
        )}

        <p className="text-white/60 text-xs mt-1.5">
          {data.summary.accountCount} cuenta{data.summary.accountCount !== 1 ? 's' : ''} activa{data.summary.accountCount !== 1 ? 's' : ''}
          {others.length > 0 && ` · ${sorted.length} monedas`}
        </p>
      </div>

      <MetricCard
        label="Ingresos del período"
        value={data.totalIncome}
        trend="up"
        subtitle="Últimas 10 transacciones"
      />

      <MetricCard
        label="Gastos del período"
        value={data.totalExpense}
        trend="down"
        subtitle="Últimas 10 transacciones"
      />
    </div>
  );
}

function MetricCard({
  label, value, trend, subtitle,
}: {
  label: string;
  value: number;
  trend: 'up' | 'down';
  subtitle: string;
}) {
  const Icon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const indicator = trend === 'up'
    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
    : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${indicator}`}>
          <Icon size={17} />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>

      <p className="font-display text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{subtitle}</p>
    </div>
  );
}
