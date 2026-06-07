'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().optional(),
  legalName: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxRegime: z.enum(['SIMPLE', 'ORDINARIO']).optional(),
});

type FormData = z.infer<typeof schema>;

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewBusinessPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/businesses', data);
      router.push(`/businesses/${res.data.id}`);
    } catch (error: any) {
      setError('root', { message: error.response?.data?.message ?? 'Error al crear la empresa' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white">Nueva empresa</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Datos de la empresa</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelCls}>
                Nombre comercial <span className="text-red-500">*</span>
              </label>
              <input {...register('name')} placeholder="Mi Empresa SAS" className={inputCls} />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>NIT</label>
                <input {...register('nit')} placeholder="900123456-7" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Régimen tributario</label>
                <select
                  {...register('taxRegime')}
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  <option value="SIMPLE">Régimen Simple</option>
                  <option value="ORDINARIO">Régimen Ordinario</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <input {...register('email')} type="email" placeholder="contacto@empresa.com" className={inputCls} />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input {...register('phone')} placeholder="+57 300 123 4567" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Dirección</label>
              <input {...register('address')} placeholder="Calle 123 #45-67, Bogotá" className={inputCls} />
            </div>

            {errors.root && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                {errors.root.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 text-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-medium transition"
              >
                {isSubmitting ? 'Creando...' : 'Crear empresa'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
