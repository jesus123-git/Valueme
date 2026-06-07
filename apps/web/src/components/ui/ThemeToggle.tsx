'use client';

import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const handleToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    // Manipula el DOM directamente, sin esperar ciclos de React
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  return (
    <button
      onClick={handleToggle}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
