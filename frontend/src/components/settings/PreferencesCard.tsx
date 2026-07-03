'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '@/context/auth.context';
import { CURRENCIES } from '@/lib/currencies';
import type { ModulePreference } from '@/types/auth.types';

const MODULES: { value: ModulePreference; label: string }[] = [
  { value: 'PERSONAL', label: 'Solo personal' },
  { value: 'BUSINESS', label: 'Solo empresas' },
  { value: 'BOTH',     label: 'Ambos' },
];

export function PreferencesCard() {
  const { user, updatePreferences } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [modulePreference, setModulePreference] = useState<ModulePreference>(user?.modulePreference ?? 'BOTH');
  const [currency, setCurrency] = useState(user?.primaryCurrency ?? 'COP');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await updatePreferences({ name: name.trim() || undefined, modulePreference, primaryCurrency: currency });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Módulos y preferencias</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Elige qué módulos ver, tu moneda y cómo te llamamos.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Nombre para mostrar</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre o apodo"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">Módulos activos</label>
        <div className="flex gap-2">
          {MODULES.map(m => {
            const active = modulePreference === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setModulePreference(m.value)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Moneda principal</label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.country})</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-2"
      >
        {saved ? <><Check size={15} /> Guardado</> : saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </section>
  );
}
