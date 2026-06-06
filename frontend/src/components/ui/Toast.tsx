'use client';

import { useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id:      string;
  message: string;
  type:    ToastType;
}

interface Props {
  toasts:    ToastData[];
  onDismiss: (id: string) => void;
}

// ─── Colores por tipo ─────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { bar: string; bg: string; icon: string }> = {
  success: {
    bar:  'bg-emerald-500',
    bg:   'bg-white border-emerald-200',
    icon: '✓',
  },
  error: {
    bar:  'bg-red-500',
    bg:   'bg-white border-red-200',
    icon: '✕',
  },
  info: {
    bar:  'bg-blue-500',
    bg:   'bg-white border-blue-200',
    icon: 'ℹ',
  },
};

// ─── Item individual ──────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const s = STYLES[toast.type];

  // Auto-dismiss a los 4 segundos
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`
        flex items-start gap-3 w-80 rounded-xl border shadow-lg overflow-hidden
        animate-slide-in ${s.bg}
      `}
      role="alert"
    >
      {/* Barra de color lateral */}
      <div className={`w-1 self-stretch flex-shrink-0 ${s.bar}`} />

      {/* Icono */}
      <div className={`mt-3.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${s.bar}`}>
        {s.icon}
      </div>

      {/* Mensaje */}
      <p className="flex-1 py-3.5 pr-2 text-sm text-slate-700 leading-snug">
        {toast.message}
      </p>

      {/* Botón cerrar */}
      <button
        onClick={onDismiss}
        className="mt-3 mr-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 text-lg leading-none"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}

// ─── Contenedor (fixed top-right) ─────────────────────────────────────────────

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[200] flex flex-col gap-2.5"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Uso: const { toasts, toast, dismissToast } = useToast();
//      toast('Cuenta creada', 'success');

import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismissToast };
}
