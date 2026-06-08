'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth.context';
import { apiGet } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/ui/WorkspaceSwitcher';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Business {
  id: string; name: string; nit?: string; taxRegime?: string;
}

interface KPIs {
  currentMonth: { income: number; expenses: number; profit: number };
  pendingCollection: { total: number; count: number };
}

// ─── Sub-módulos del panel empresarial ───────────────────────────────────────

interface NavItem {
  href:     string;
  label:    string;
  icon:     string;
  desc:     string;
  color:    string;
}

const getNavItems = (id: string): NavItem[] => [
  { href: `/empresas/${id}/clientes`,      label: 'Clientes',        icon: '👥', desc: 'CRM y estado de cuenta',        color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800/40' },
  { href: `/empresas/${id}/facturas`,      label: 'Facturas',        icon: '🧾', desc: 'Emitir y gestionar facturas',    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40' },
  { href: `/empresas/${id}/productos`,     label: 'Productos',       icon: '📦', desc: 'Catálogo e inventario',          color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' },
  { href: `/empresas/${id}/cotizaciones`,  label: 'Cotizaciones',    icon: '📋', desc: 'Generar y convertir cotiz.',     color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800/40' },
  { href: `/empresas/${id}/proveedores`,   label: 'Proveedores',     icon: '🚚', desc: 'Directorio de proveedores',      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/40' },
  { href: `/empresas/${id}/compras`,       label: 'Órd. de Compra',  icon: '🛒', desc: 'Gestión de compras y pagos',     color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/40' },
  { href: `/empresas/${id}/listas-precios`,label: 'Listas de precios',icon:'💲', desc: 'Mayorista, minorista, especial', color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800/40' },
  { href: `/empresas/${id}/reportes`,      label: 'Reportes',        icon: '📊', desc: 'P&L, cartera, top productos',    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40' },
];

// ─── Página ───────────────────────────────────────────────────────────────────

export default function BusinessDashboardPage() {
  const { id }           = useParams<{ id: string }>();
  const { user, logout } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [kpis, setKpis]         = useState<KPIs | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<Business>(`/businesses/${id}`),
      apiGet<KPIs>(`/businesses/${id}/dashboard`),
    ])
      .then(([biz, k]) => { setBusiness(biz); setKpis(k); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const navItems = getNavItems(id as string);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
              <span className="text-sm">🏢</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-white text-lg hidden md:block">MaIA</span>
          </div>

          <WorkspaceSwitcher />
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/empresas" className="text-sm text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
              ← Mis empresas
            </Link>
            <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={logout} className="text-sm px-3 py-2">Salir</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Encabezado empresa */}
        {loading ? (
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {business?.name ?? 'Empresa'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {business?.nit && <span className="text-sm text-slate-400 dark:text-slate-500">NIT: {business.nit}</span>}
              {business?.taxRegime && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                  {business.taxRegime}
                </span>
              )}
            </div>
          </div>
        )}

        {/* KPIs del mes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos del mes',    value: kpis?.currentMonth.income,    icon: '📈', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Gastos del mes',      value: kpis?.currentMonth.expenses,  icon: '📉', color: 'text-rose-600 dark:text-rose-400' },
            { label: 'Utilidad neta',       value: kpis?.currentMonth.profit,    icon: '💰', color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Cobros pendientes',   value: kpis?.pendingCollection.total, icon: '⏳', color: 'text-amber-600 dark:text-amber-400' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              {loading ? (
                <div className="h-16 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{kpi.icon}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>
                    {formatCurrency(kpi.value ?? 0, 'COP')}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Grid de módulos */}
        <div>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-4">Módulos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}>
                <div className={`rounded-2xl border p-5 h-full hover:shadow-md transition-all duration-200 cursor-pointer group ${item.color}`}>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <p className="font-bold text-sm leading-tight">{item.label}</p>
                  <p className="text-xs opacity-70 mt-1 leading-tight">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
