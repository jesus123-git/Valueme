'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { setTheme } = useTheme();
  const [isDark,  setIsDark]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));
    setMounted(true);

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return <div className={cn('h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse', className)} aria-hidden />;
  }

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    setTheme(next);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      className={cn(
        'relative w-9 h-9 rounded-full flex items-center justify-center',
        'border transition-colors duration-450',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isDark
          ? 'bg-slate-700 border-slate-600 text-amber-300 hover:bg-slate-600 focus:ring-amber-400 focus:ring-offset-slate-900'
          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 focus:ring-slate-400',
        className,
      )}
    >
      {/* El icono rota y hace fade al cambiar */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
        }}
      >
        <Sun size={16} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-500"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      >
        <Moon size={16} />
      </span>
    </button>
  );
}
