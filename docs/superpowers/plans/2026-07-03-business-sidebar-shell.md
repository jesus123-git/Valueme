# Shell con barra lateral en empresas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al entrar a una función de un negocio, mostrar una barra lateral persistente con todas las funciones; el dashboard del negocio (los cuadros) se mantiene sin barra.

**Architecture:** Un route group `(shell)` dentro de `empresas/[id]/` agrupa las páginas de función bajo un `layout.tsx` que renderiza `BusinessShell` (barra lateral + top bar). El dashboard `[id]/page.tsx` queda fuera del grupo. Cada página de función se refactoriza a contenido-only. Solo frontend.

**Tech Stack:** Next.js 14 App Router, Tailwind, lucide-react.

**Ruta del proyecto:** `/Users/sebastiansalgado/finanzas` (`frontend/`). Todos los comandos `tsc` corren en `frontend/`.

**Verificación:** `npx tsc --noEmit` por tarea + prueba manual. Sin tests unitarios.

**Nota sobre estado transitorio:** tras la Tarea 2 (mover páginas al grupo + shell) las páginas mostrarán su encabezado propio ADEMÁS de la barra del shell (doble encabezado) hasta que cada una se refactorice en las Tareas 3–11. Compila y funciona en todo momento; es un estado intermedio esperado.

---

### Task 1: Componente BusinessShell + helper de navegación

**Files:**
- Create: `frontend/src/components/business/BusinessShell.tsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/business/BusinessShell.tsx`:
```tsx
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

  // Cerrar el cajón al cambiar de ruta (móvil)
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const items = getBusinessNavItems(id as string);
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href;

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
      {/* Top bar */}
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
        {/* Sidebar fija (desktop) */}
        <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[calc(100vh-57px)]">
          {nav}
        </aside>

        {/* Cajón (móvil) */}
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

        {/* Contenido */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`. (Nota: el `isActive` usa la misma comparación en ambas ramas por ahora; es correcto porque todas las funciones son rutas hoja. Se deja el campo `exact` explícito para claridad y para el ítem Resumen.)

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/components/business/BusinessShell.tsx
git commit -m "feat(empresas): add BusinessShell sidebar component"
```

---

### Task 2: Route group (shell) + mover páginas + stub Vender

**Files:**
- Create: `frontend/src/app/(dashboard)/empresas/[id]/(shell)/layout.tsx`
- Create: `frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx`
- Move: las 9 carpetas de función a `(shell)/`

- [ ] **Step 1: Crear el layout del grupo**

Crear `frontend/src/app/(dashboard)/empresas/[id]/(shell)/layout.tsx`:
```tsx
import { type ReactNode } from 'react';
import { BusinessShell } from '@/components/business/BusinessShell';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <BusinessShell>{children}</BusinessShell>;
}
```

- [ ] **Step 2: Crear el stub de Vender**

Crear `frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx`:
```tsx
'use client';

import { Store } from 'lucide-react';

export default function VenderPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
        <Store size={26} className="text-violet-600 dark:text-violet-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Vender</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Próximamente — estamos construyendo el punto de venta para registrar tus ventas al instante.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Mover las 9 carpetas de función al grupo**

```bash
cd /Users/sebastiansalgado/finanzas/frontend/src/app/\(dashboard\)/empresas/\[id\]
for d in facturas clientes productos cotizaciones proveedores compras listas-precios reportes equipo; do
  git mv "$d" "(shell)/$d"
done
ls -la "(shell)"
```
Expected: las 9 carpetas ahora dentro de `(shell)/` junto a `layout.tsx` y `vender/`. El `page.tsx` del dashboard permanece en `[id]/` (no se mueve).

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`. (Las páginas conservan por ahora su encabezado propio → doble encabezado transitorio; se resuelve en las tareas siguientes.)

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add -A "frontend/src/app/(dashboard)/empresas/[id]"
git commit -m "feat(empresas): add (shell) route group with sidebar layout and Vender stub"
```

---

### Tasks 3–11: Refactor de cada página a contenido-only

**Patrón común (aplica a cada página):**

Cada página de función vive ahora en `frontend/src/app/(dashboard)/empresas/[id]/(shell)/<carpeta>/page.tsx` y sigue siendo `'use client'`. Hoy renderiza una pantalla completa: un contenedor raíz `min-h-screen ...` con un **encabezado propio** al inicio (habitualmente un `<Link>`/botón con flecha `ArrowLeft` de "volver" + `<ThemeToggle />`, a veces `Logo`/`UserMenu`).

Transformación por página:
1. Leer el archivo completo.
2. Eliminar el bloque de **encabezado propio** (el `<header>`/`<nav>`/div superior con la flecha de volver y el `ThemeToggle`). El shell ya aporta top bar (con volver a "Mis empresas"), tema y menú de usuario.
3. Cambiar el contenedor raíz de `min-h-screen bg-... ` a un contenedor de contenido: `<div className="p-4 sm:p-6 max-w-6xl mx-auto">` (o conservar el `<main>`/ancho interno que ya tuviera, quitando solo `min-h-screen` y el fondo de pantalla completa). El shell ya pone el fondo y el scroll.
4. Quitar imports que queden sin usar (ej. `ThemeToggle`, `ArrowLeft`, `Logo`, `UserMenu` si ya no se referencian). NO quitar imports que el contenido siga usando.
5. **No** tocar lógica de datos, formularios, modales, mutaciones ni llamadas a API. Es solo reacomodo de layout.
6. Conservar el título de la página (ej. "Facturas") como encabezado de contenido si lo tenía dentro; si el título estaba solo en el header eliminado, añadir un `<h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Facturas</h1>` al inicio del contenido.

Verificar tras cada página:
```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

Commit por página, p. ej.:
```bash
cd /Users/sebastiansalgado/finanzas
git add "frontend/src/app/(dashboard)/empresas/[id]/(shell)/facturas/page.tsx"
git commit -m "refactor(empresas): facturas as content-only inside shell"
```

- [ ] **Task 3:** `(shell)/facturas/page.tsx` — quitar encabezado propio (importa `ArrowLeft`, `ThemeToggle`), dejar el formulario/tabla de facturas como contenido. Título "Facturas".
- [ ] **Task 4:** `(shell)/clientes/page.tsx` — idem (importa `ArrowLeft`, `ThemeToggle`). Título "Clientes".
- [ ] **Task 5:** `(shell)/productos/page.tsx` — idem (importa `ArrowLeft`, `ThemeToggle`, `MoneyInput` que SÍ se usa). Título "Productos".
- [ ] **Task 6:** `(shell)/cotizaciones/page.tsx` — leer y aplicar el patrón. Título "Cotizaciones".
- [ ] **Task 7:** `(shell)/proveedores/page.tsx` — leer y aplicar el patrón. Título "Proveedores".
- [ ] **Task 8:** `(shell)/compras/page.tsx` — leer y aplicar el patrón. Título "Órdenes de compra".
- [ ] **Task 9:** `(shell)/listas-precios/page.tsx` — leer y aplicar el patrón. Título "Listas de precios". (Ojo: esta página usa `PlanGate`/`UpgradeModal`; conservar esa lógica intacta.)
- [ ] **Task 10:** `(shell)/reportes/page.tsx` — leer y aplicar el patrón. Título "Reportes".
- [ ] **Task 11:** `(shell)/equipo/page.tsx` — leer y aplicar el patrón. Título "Equipo".

---

### Task 12: Verificación final y push

**Files:** ninguno.

- [ ] **Step 1: Compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 2: Prueba manual (dev server)**

Con `npm run dev` en `frontend/`:
1. Entrar a un negocio (`/empresas/[id]`) → se ven los cuadros/KPIs, SIN barra lateral.
2. Clic en una tarjeta (ej. Facturas) → aparece la barra lateral con todas las funciones; la función activa resaltada; sin encabezado duplicado.
3. Navegar entre funciones desde la barra sin volver al dashboard.
4. "Vender" muestra "Próximamente".
5. "← Mis empresas" vuelve al listado; "Resumen" vuelve a los cuadros.
6. En viewport móvil: la barra se colapsa; el botón hamburguesa abre el cajón; al elegir un ítem se cierra.

Expected: todo el flujo funciona.

- [ ] **Step 3: Push**

```bash
cd /Users/sebastiansalgado/finanzas
git push origin main
```

---

## Self-Review

- **Cobertura del spec:** route group `(shell)` + layout (Task 2), `BusinessShell` con sidebar + top bar + responsive (Task 1), stub Vender (Task 2), refactor de las 9 páginas a contenido-only (Tasks 3–11), dashboard sin cambios (no task — se deja intacto a propósito), verificación (Task 12). ✅
- **Sin backend:** ninguna tarea toca `backend/`. ✅
- **Consistencia:** `getBusinessNavItems` define las rutas exactas que existen tras el move; el ítem Resumen usa `exact`. `BusinessShell` consumido por `(shell)/layout.tsx`. ✅
- **Estado transitorio documentado:** doble encabezado entre Task 2 y Tasks 3–11; compila en cada paso. ✅
- **Riesgo:** el refactor por página depende de leer cada archivo (encabezados distintos). Por eso cada página es su propia tarea con el patrón explícito y verificación `tsc` individual. ✅
