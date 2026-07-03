'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth.context';
import { isModuleBlocked, moduleHomePath } from '@/lib/modules';

// Gating client-side: fuerza onboarding y bloquea módulos no habilitados.
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;
    // 1. Onboarding pendiente → al asistente
    if (!user.onboardingCompletedAt) {
      router.replace('/onboarding');
      return;
    }
    // 2. Ruta de un módulo deshabilitado → al módulo habilitado
    if (isModuleBlocked(pathname, user.modulePreference)) {
      router.replace(moduleHomePath(user));
    }
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}
