'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth.context';
import { availableModules as computeAvailable } from '@/lib/modules';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type WorkspaceMode = 'personal' | 'empresas';

interface WorkspaceContextValue {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  available: WorkspaceMode[];
  isPersonal: boolean;
  isEmpresa: boolean;
  /** Color de acento según el workspace activo */
  accent: {
    /** Clase Tailwind para texto de acento (ej. en chips, links) */
    text: string;
    /** Clase Tailwind para fondo de acento (ej. botón primario) */
    bg: string;
    /** Clase Tailwind para borde de acento */
    border: string;
    /** Clase Tailwind para fondo hover */
    hover: string;
    /** Clase Tailwind para anillo focus */
    ring: string;
  };
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ─── Paletas por workspace ────────────────────────────────────────────────────

const PERSONAL_ACCENT = {
  text:   'text-emerald-600 dark:text-emerald-400',
  bg:     'bg-emerald-600 hover:bg-emerald-700',
  border: 'border-emerald-500',
  hover:  'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  ring:   'focus:ring-emerald-500',
};

const EMPRESA_ACCENT = {
  text:   'text-violet-600 dark:text-violet-400',
  bg:     'bg-violet-600 hover:bg-violet-700',
  border: 'border-violet-500',
  hover:  'hover:bg-violet-50 dark:hover:bg-violet-900/20',
  ring:   'focus:ring-violet-500',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const available: WorkspaceMode[] = user ? computeAvailable(user.modulePreference) : ['personal', 'empresas'];

  // Inferir modo desde la ruta actual
  const inferMode = (path: string): WorkspaceMode =>
    path.startsWith('/empresas') ? 'empresas' : 'personal';

  const [mode, setModeState] = useState<WorkspaceMode>(() => inferMode(pathname));

  // Sincronizar cuando la ruta cambia desde fuera
  useEffect(() => {
    setModeState(inferMode(pathname));
  }, [pathname]);

  const setMode = (next: WorkspaceMode) => {
    setModeState(next);
    if (next === 'personal') {
      router.push('/personal');
    } else {
      router.push('/empresas');
    }
  };

  const accent = mode === 'empresas' ? EMPRESA_ACCENT : PERSONAL_ACCENT;

  return (
    <WorkspaceContext.Provider
      value={{
        mode,
        setMode,
        available,
        isPersonal: mode === 'personal',
        isEmpresa:  mode === 'empresas',
        accent,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace debe usarse dentro de WorkspaceProvider');
  return ctx;
}
