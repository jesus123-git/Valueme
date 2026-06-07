'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { AuthResponse } from '@/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post<AuthResponse>('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      router.push('/dashboard');
    } catch {
      setError('root', { message: 'Email o contraseña incorrectos' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      {/* Toggle de tema en esquina superior derecha */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bienvenido</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Error general */}
          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {errors.root.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
