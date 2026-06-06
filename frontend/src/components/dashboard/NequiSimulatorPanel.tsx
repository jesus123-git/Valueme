'use client';

import { useState } from 'react';
import type { BankAccount } from '@/types/dashboard.types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  accounts: BankAccount[];
  onSuccess: () => void; // llama a refetch() del dashboard
}

interface SimulationResult {
  ok: boolean;
  message: string;
}

// ─── Preset de simulaciones rápidas ──────────────────────────────────────────

const PRESETS = [
  { label: 'Recibir $50.000',  amount: 50_000,  type: 'INCOME'  as const, icon: '📥', color: 'emerald' },
  { label: 'Recibir $200.000', amount: 200_000, type: 'INCOME'  as const, icon: '📥', color: 'emerald' },
  { label: 'Pago $15.000',     amount: 15_000,  type: 'EXPENSE' as const, icon: '📤', color: 'rose'    },
  { label: 'Pago $80.000',     amount: 80_000,  type: 'EXPENSE' as const, icon: '📤', color: 'rose'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function NequiSimulatorPanel({ accounts, onSuccess }: Props) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<SimulationResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Solo cuentas marcadas como Nequi
  const nequiAccounts = accounts.filter(
    (a) => a.provider?.toUpperCase() === 'NEQUI' && a.externalAccountId,
  );

  // Si no hay ninguna cuenta Nequi, mostramos el panel de configuración
  if (nequiAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📱</span>
          <p className="font-semibold text-pink-700 text-sm">Simulador Nequi</p>
        </div>
        <p className="text-xs text-pink-600 leading-relaxed">
          Para activar el simulador, crea una cuenta con:
        </p>
        <ul className="mt-2 space-y-0.5 text-xs text-pink-600 list-disc list-inside">
          <li><strong>Provider</strong>: <code className="bg-pink-100 px-1 rounded">NEQUI</code></li>
          <li><strong>Número de teléfono</strong> en el campo "ID externo" (ej: <code className="bg-pink-100 px-1 rounded">3123456789</code>)</li>
        </ul>
      </div>
    );
  }

  const activeAccount = nequiAccounts[0];

  async function simulate(amount: number, type: 'INCOME' | 'EXPENSE', description: string) {
    setLoading(true);
    setResult(null);

    const secret = process.env.NEXT_PUBLIC_NEQUI_WEBHOOK_SECRET ?? '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    const payload = {
      phoneNumber:   activeAccount.externalAccountId!,
      amount,
      type,
      description,
      timestamp:     new Date().toISOString(),
      transactionId: `TRX-SIM-${Date.now()}`,
    };

    try {
      const res = await fetch(`${apiUrl}/api/v1/webhooks/nequi`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nequi-Auth': secret,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Error ${res.status}`);
      }

      const data = await res.json() as { accountName: string };
      setResult({ ok: true, message: `✓ Registrado en "${data.accountName}"` });
      // Refrescar el dashboard para reflejar el nuevo balance y la transacción
      setTimeout(onSuccess, 300);
    } catch (err) {
      setResult({
        ok:      false,
        message: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden">
      {/* ── Header colapsable ──────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            N
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Simulador Nequi</p>
            <p className="text-xs text-slate-500">{activeAccount.name} · {activeAccount.externalAccountId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            Activo
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Contenido expandible ───────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-pink-100">

          {/* Presets rápidos */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Simulación rápida
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={`${preset.type}-${preset.amount}`}
                  disabled={loading}
                  onClick={() =>
                    simulate(
                      preset.amount,
                      preset.type,
                      preset.type === 'INCOME'
                        ? `Simulación: ${formatCOP(preset.amount)} recibidos vía Nequi`
                        : `Simulación: Pago de ${formatCOP(preset.amount)} vía Nequi`,
                    )
                  }
                  className={`
                    flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold
                    transition-all border
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${preset.color === 'emerald'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }
                  `}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/60 rounded-xl px-4 py-3">
              <svg className="animate-spin h-4 w-4 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando al webhook…
            </div>
          )}

          {result && !loading && (
            <div className={`text-xs rounded-xl px-4 py-3 font-medium ${
              result.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {result.message}
            </div>
          )}

          {/* Nota técnica */}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Llama a <code className="bg-white/80 px-1 rounded">POST /api/v1/webhooks/nequi</code> con el header{' '}
            <code className="bg-white/80 px-1 rounded">X-Nequi-Auth</code> — idéntico a cómo lo haría Nequi en producción.
          </p>
        </div>
      )}
    </div>
  );
}
