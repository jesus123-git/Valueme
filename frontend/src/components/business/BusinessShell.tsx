'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserMenu } from '@/components/ui/UserMenu';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Users, Package, ClipboardList,
  Truck, ShoppingCart, Tag, BarChart2, Users2, Store,
  ChevronLeft, Menu, X, type LucideIcon,
} from 'lucide-react';

interface Business { id: string; name: string }

interface NavItem { href: string; label: string; icon: LucideIcon; exact?: boolean }

function getBusinessNavItems(id: string): NavItem[] {
  return [
    { href: `/empresas/${id}`,                label: 'Resumen',          icon: LayoutDashboard, exact: true },
    { href: `/empresas/${id}/vender`,         label: 'Vender',           icon: Store },
    { href: `/empresas/${id}/facturas`,       label: 'Facturas',         icon: FileText },
    { href: `/empresas/${id}/cotizaciones`,   label: 'Cotizaciones',     icon: ClipboardList },
    { href: `/empresas/${id}/clientes`,       label: 'Clientes',         icon: Users },
    { href: `/empresas/${id}/productos`,      label: 'Productos',        icon: Package },
    { href: `/empresas/${id}/proveedores`,    label: 'Proveedores',      icon: Truck },
    { href: `/empresas/${id}/compras`,        label: 'Órd. de compra',   icon: ShoppingCart },
    { href: `/empresas/${id}/listas-precios`, label: 'Listas de precios', icon: Tag },
    { href: `/empresas/${id}/reportes`,       label: 'Reportes',         icon: BarChart2 },
    { href: `/empresas/${id}/equipo`,         label: 'Equipo',           icon: Users2 },
  ];
}

export function BusinessShell({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<Business>(`/businesses/${id}`).then(setBusiness).catch(() => setBusiness(null));
  }, [id]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const items = getBusinessNavItems(id as string);
  const isActive = (item: NavItem) => pathname === item.href;

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(item => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <Link
            href="/empresas"
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Mis empresas</span>
          </Link>

          <span className="font-bold text-slate-800 dark:text-white truncate">
            {business?.name ?? 'Empresa'}
          </span>

          <div className="flex-1" />
          <ThemeToggle />
          <div className="pl-3 border-l border-slate-200 dark:border-slate-700 flex items-center">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[calc(100vh-57px)]">
          {nav}
        </aside>

        {drawerOpen && (
          <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white truncate">{business?.name ?? 'Empresa'}</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar menú">
                  <X size={18} />
                </button>
              </div>
              {nav}
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
