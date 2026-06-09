'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Clave de localStorage que usa next-themes
const STORAGE_KEY = 'finanzas-theme';

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const [isDark,  setIsDark]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    // Leer estado inicial directamente del DOM (next-themes ya lo aplicó)
    const readDark = () => root.classList.contains('dark');
    setIsDark(readDark());
    setMounted(true);

    // Observar cambios externos al botón (next-themes, otro tab, SSR)
    const observer = new MutationObserver(() => setIsDark(readDark()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn('h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse', className)}
        aria-hidden
      />
    );
  }

  const handleToggle = () => {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';

    // 1. Cambiar clase en <html> de forma inmediata (sin esperar React/next-themes)
    root.classList.remove('light', 'dark');
    root.classList.add(next);

    // 2. Persistir en localStorage con la misma clave que usa next-themes
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}

    // El MutationObserver se encarga de actualizar isDark automáticamente
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      className={cn(
        'relative w-9 h-9 rounded-full flex items-center justify-center',
        'border transition-colors duration-300',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isDark
          ? 'bg-slate-700 border-slate-600 text-amber-300 hover:bg-slate-600 focus:ring-amber-400 focus:ring-offset-slate-900'
          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 focus:ring-slate-400',
        className,
      )}
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity:   isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
        }}
      >
        <Sun size={16} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity:   isDark ? 0 : 1,
          transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      >
        <Moon size={16} />
      </span>
    </button>
  );
}
