'use client';

import { useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'finanzas-theme';

interface Props {
  className?: string;
}

/**
 * ThemeToggle — botón para alternar entre modo claro y oscuro.
 *
 * Los íconos y colores del botón se controlan con clases `dark:` de Tailwind,
 * NO con estado React, para que siempre reflejen el estado real del DOM sin
 * depender de efectos, temporizadores ni sync con next-themes.
 */
export function ThemeToggle({ className }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    const root = document.documentElement;
    const isDarkNow = root.classList.contains('dark');
    const next      = isDarkNow ? 'light' : 'dark';

    root.classList.remove('light', 'dark');
    root.classList.add(next);

    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
  };

  // Asegura que aria-label se actualice en cliente sin hydration-mismatch
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const update = () => {
      const dark = document.documentElement.classList.contains('dark');
      btn.setAttribute('aria-label', dark ? 'Cambiar a modo día' : 'Cambiar a modo noche');
      btn.setAttribute('title',      dark ? 'Modo día'           : 'Modo noche');
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={handleToggle}
      aria-label="Cambiar tema"
      title="Cambiar tema"
      className={cn(
        // Tamaño y forma
        'relative w-9 h-9 rounded-full flex items-center justify-center',
        // Borde y transición
        'border transition-colors duration-300',
        // Focus
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        // Colores — modo claro
        'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200',
        'focus:ring-slate-400',
        // Colores — modo oscuro (dark: clases CSS, igual que todo el resto de la UI)
        'dark:bg-slate-700 dark:border-slate-600 dark:text-amber-300 dark:hover:bg-slate-600',
        'dark:focus:ring-amber-400 dark:focus:ring-offset-slate-900',
        className,
      )}
    >
      {/* ☀️ sol — oculto en claro, visible en oscuro */}
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'transition-all duration-300',
          // En modo claro: invisible y rotado
          'opacity-0 -rotate-90 scale-50',
          // En modo oscuro: visible y normal
          'dark:opacity-100 dark:rotate-0 dark:scale-100',
        )}
        aria-hidden
      >
        <Sun size={16} />
      </span>

      {/* 🌙 luna — visible en claro, oculta en oscuro */}
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'transition-all duration-300',
          // En modo claro: visible y normal
          'opacity-100 rotate-0 scale-100',
          // En modo oscuro: invisible y rotado
          'dark:opacity-0 dark:rotate-90 dark:scale-50',
        )}
        aria-hidden
      >
        <Moon size={16} />
      </span>
    </button>
  );
}
