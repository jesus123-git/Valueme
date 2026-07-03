'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth.context';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CURRENCIES } from '@/lib/currencies';
import type { ModulePreference } from '@/types/auth.types';

type StepId = 'name' | 'module' | 'currency';
const STEPS: StepId[] = ['name', 'module', 'currency'];

const MODULE_OPTIONS: { value: ModulePreference; label: string; desc: string; icon: typeof User }[] = [
  { value: 'PERSONAL', label: 'Solo personal',  desc: 'Cuentas, gastos y ahorro',          icon: User },
  { value: 'BUSINESS', label: 'Solo empresas',  desc: 'Facturas, clientes y reportes',     icon: Building2 },
  { value: 'BOTH',     label: 'Ambos',          desc: 'Gestiona lo personal y tu negocio', icon: Sparkles },
];

export default function OnboardingPage() {
  const { user, loading, completeOnboarding } = useAuth();
  const router = useRouter();

  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [modulePreference, setModulePreference] = useState<ModulePreference>('BOTH');
  const [currency, setCurrency] = useState('COP');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prellenar y saltar si ya se completó el onboarding.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.onboardingCompletedAt) { router.replace('/personal'); return; }
    if (user.name) setName(user.name);
    if (user.primaryCurrency) setCurrency(user.primaryCurrency);
    if (user.modulePreference) setModulePreference(user.modulePreference);
  }, [user, loading, router]);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const progress = useMemo(() => ((stepIdx + 1) / STEPS.length) * 100, [stepIdx]);

  const canAdvance =
    step === 'name' ? name.trim().length > 0 :
    step === 'currency' ? currency.length > 0 :
    true;

  async function handleNext() {
    setError('');
    if (!isLast) { setStepIdx(i => i + 1); return; }
    setSaving(true);
    try {
      await completeOnboarding({ name: name.trim() || undefined, modulePreference, primaryCurrency: currency });
      // completeOnboarding redirige al módulo preferido
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar tus preferencias');
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={44} href={null} /></div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          {/* Barra de progreso */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 mb-6 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {step === 'name' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Cómo quieres que te llamemos?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Puedes usar tu nombre o un apodo.</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre o apodo"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
              />
            </div>
          )}

          {step === 'module' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Qué quieres gestionar?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Podrás cambiarlo luego en Configuración.</p>
              <div className="flex flex-col gap-2 mt-1">
                {MODULE_OPTIONS.map(opt => {
                  const active = modulePreference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setModulePreference(opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <opt.icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-white">{opt.label}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'currency' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Cuál es tu moneda principal?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">La usaremos para mostrar tus cifras.</p>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.country})</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-500 dark:text-red-400 mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            {stepIdx > 0 && (
              <button
                onClick={() => { setError(''); setStepIdx(i => i - 1); }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition"
              >
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance || saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition"
            >
              {saving ? 'Guardando…' : isLast ? 'Empezar' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
