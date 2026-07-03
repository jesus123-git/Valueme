'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth.context';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { moduleHomePath } from '@/lib/modules';

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Si ya hay sesión, saltar el splash y entrar a la app.
  useEffect(() => {
    if (loading || !user) return;
    if (!user.onboardingCompletedAt) router.replace('/onboarding');
    else router.replace(moduleHomePath(user));
  }, [user, loading, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md text-center flex flex-col items-center gap-6">
        <Logo size={64} href={null} />

        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Bienvenido a ValueMe
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Tus finanzas personales y de tu negocio, con claridad y en un solo lugar.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3 mt-2">
          <Link
            href="/register"
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 text-sm font-semibold transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-10">
        Tus datos están protegidos con cifrado de extremo a extremo.
      </p>
    </main>
  );
}
