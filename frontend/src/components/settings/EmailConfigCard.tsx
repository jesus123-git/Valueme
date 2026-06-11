'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Button from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmailConfig {
  id:           string;
  emailUser:    string;
  emailHost:    string;
  emailPort:    number;
  emailMailbox: string;
}

interface FormState {
  emailUser:    string;
  emailPassword: string;
  emailHost:    string;
  emailPort:    string;
  emailMailbox: string;
}

const DEFAULTS: FormState = {
  emailUser:     '',
  emailPassword: '',
  emailHost:     'imap.gmail.com',
  emailPort:     '993',
  emailMailbox:  'INBOX',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmailConfigCard() {
  const [config,   setConfig]   = useState<EmailConfig | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [form,     setForm]     = useState<FormState>(DEFAULTS);
  const { toasts, toast, dismissToast } = useToast();

  // ── Cargar configuración existente ───────────────────────────────────────

  useEffect(() => {
    apiGet<EmailConfig | null>('/email-config')
      .then(data => setConfig(data))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  // ── Guardar ──────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await apiPost<EmailConfig>('/email-config', {
        emailUser:    form.emailUser,
        emailPassword: form.emailPassword,
        emailHost:    form.emailHost    || 'imap.gmail.com',
        emailPort:    parseInt(form.emailPort || '993', 10),
        emailMailbox: form.emailMailbox || 'INBOX',
      });
      setConfig(saved);
      setForm(DEFAULTS);
      toast('Correo conectado correctamente', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Desconectar ──────────────────────────────────────────────────────────

  async function handleRemove() {
    if (!confirm('¿Desconectar la integración de correo?')) return;
    setRemoving(true);
    try {
      await apiDelete('/email-config');
      setConfig(null);
      toast('Integración eliminada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al desconectar', 'error');
    } finally {
      setRemoving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 animate-pulse">
        <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
        <div className="h-4 w-64 bg-neutral-100 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Integración de correo (IMAP)
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Conecta tu Gmail para que MaIA detecte automáticamente transacciones de Nequi y Bancolombia.
        </p>

        {config ? (
          /* ── Estado: conectado ───────────────────────────────────────── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate">
                  {config.emailUser}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  {config.emailHost}:{config.emailPort} · {config.emailMailbox}
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              onClick={handleRemove}
              disabled={removing}
              className="w-full sm:w-auto"
            >
              {removing ? 'Desconectando…' : 'Desconectar correo'}
            </Button>
          </div>
        ) : (
          /* ── Estado: no conectado ────────────────────────────────────── */
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="tucorreo@gmail.com"
                  value={form.emailUser}
                  onChange={e => setForm(f => ({ ...f, emailUser: e.target.value }))}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Contraseña de aplicación
                </label>
                <input
                  type="password"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={form.emailPassword}
                  onChange={e => setForm(f => ({ ...f, emailPassword: e.target.value }))}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Host IMAP <span className="text-neutral-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="imap.gmail.com"
                  value={form.emailHost}
                  onChange={e => setForm(f => ({ ...f, emailHost: e.target.value }))}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Puerto <span className="text-neutral-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  placeholder="993"
                  value={form.emailPort}
                  onChange={e => setForm(f => ({ ...f, emailPort: e.target.value }))}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              Para Gmail usa una <strong>contraseña de aplicación</strong> (no tu contraseña normal).
              Ve a <strong>myaccount.google.com → Seguridad → Contraseñas de aplicaciones</strong>.
            </p>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Guardando…' : 'Conectar correo'}
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
