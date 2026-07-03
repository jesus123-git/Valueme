'use client';

import { ThemeToggle }    from '@/components/ui/ThemeToggle';
import { UserMenu }       from '@/components/ui/UserMenu';
import { EmailConfigCard } from '@/components/settings/EmailConfigCard';
import { PreferencesCard } from '@/components/settings/PreferencesCard';

// ─── Página de Configuración ──────────────────────────────────────────────────

export default function ConfiguracionPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* Barra de navegación */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Configuración
        </h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
        <PreferencesCard />
        <EmailConfigCard />
      </main>
    </div>
  );
}
