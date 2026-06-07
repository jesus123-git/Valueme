'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Business } from '@/types';
import Link from 'next/link';
import { Building2, Plus, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const res = await api.get<Business[]>('/businesses');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-gray-900">Finanzas</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Hola, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Empresas</h1>
            <p className="text-gray-500 mt-1">Gestiona tus negocios desde un solo lugar</p>
          </div>
          <Link
            href="/businesses/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition"
          >
            <Plus size={18} />
            Nueva empresa
          </Link>
        </div>

        {/* Lista de empresas */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes empresas aún</h3>
            <p className="text-gray-500 mb-6">Crea tu primera empresa para empezar a gestionar tus finanzas</p>
            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <Plus size={18} />
              Crear empresa
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses?.map((business) => (
              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{business.name}</h3>
                {business.nit && (
                  <p className="text-sm text-gray-400">NIT: {business.nit}</p>
                )}
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                  <span>{business._count?.customers ?? 0} clientes</span>
                  <span>{business._count?.invoices ?? 0} facturas</span>
                  <span>{business._count?.transactions ?? 0} movimientos</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
