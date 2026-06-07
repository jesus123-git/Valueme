'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-semibold text-gray-900">Nueva empresa</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Datos de la empresa</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre comercial <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                placeholder="Mi Empresa SAS"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* NIT y Razón social */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                <input
                  {...register('nit')}
                  placeholder="900123456-7"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régimen tributario</label>
                <select
                  {...register('taxRegime')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="SIMPLE">Régimen Simple</option>
                  <option value="ORDINARIO">Régimen Ordinario</option>
                </select>
              </div>
            </div>

            {/* Email y Teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="contacto@empresa.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  {...register('phone')}
                  placeholder="+57 300 123 4567"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                {...register('address')}
                placeholder="Calle 123 #45-67, Bogotá"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {errors.root && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                {errors.root.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 text-center border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
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
