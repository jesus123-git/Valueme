# Shell con barra lateral en el módulo de empresas — Diseño

## Goal

Cuando el usuario entra a una función de un negocio (Facturas, Clientes, etc.), mostrar una barra lateral persistente con todas las funciones para navegar entre ellas sin volver al dashboard. El dashboard del negocio (los "cuadros" con KPIs + cuadrícula de módulos) se mantiene tal cual y NO lleva barra lateral: la barra aparece solo al entrar a una función.

Es intencionalmente distinto de Treinta (que muestra la barra siempre): aquí la entrada al negocio son los cuadros; la barra es la vista "dentro de una función".

## Alcance

**Solo frontend.** No toca backend ni base de datos. Un único subsistema: la navegación del módulo empresas. La feature "Vender" (punto de venta) queda como un stub "Próximamente" y se construye en un proyecto aparte.

## Arquitectura

### Route group `(shell)`

Se crea un grupo de rutas `(shell)` dentro de `frontend/src/app/(dashboard)/empresas/[id]/`. Los grupos con paréntesis **no añaden segmento a la URL**, así que las rutas actuales se conservan (`/empresas/[id]/facturas` sigue igual).

- Se **mueven** al grupo las carpetas de función: `facturas`, `clientes`, `productos`, `cotizaciones`, `proveedores`, `compras`, `listas-precios`, `reportes`, `equipo`.
- Se crea `(shell)/vender/page.tsx` (stub "Próximamente").
- Se crea `(shell)/layout.tsx` que renderiza el componente `BusinessShell` alrededor de `{children}`.
- El **dashboard** `[id]/page.tsx` (los cuadros) queda FUERA del grupo → sin barra lateral.
- `[id]/layout.tsx` (que provee `PlanProvider` + `UpgradeModalProvider`) sigue envolviendo TODO, incluido el grupo. No se modifica.

### Jerarquía de layouts resultante

```
(dashboard)/empresas/[id]/layout.tsx          → PlanProvider + UpgradeModalProvider (sin cambios)
  ├── page.tsx                                 → Dashboard "cuadros" (sin barra lateral)
  └── (shell)/layout.tsx                       → BusinessShell (barra lateral + top bar)
        ├── facturas/page.tsx                  → contenido, sin encabezado propio
        ├── clientes/page.tsx
        ├── productos/page.tsx
        ├── cotizaciones/page.tsx
        ├── proveedores/page.tsx
        ├── compras/page.tsx
        ├── listas-precios/page.tsx
        ├── reportes/page.tsx
        ├── equipo/page.tsx
        └── vender/page.tsx                    → stub "Próximamente"
```

## Componentes

### `BusinessShell` (`frontend/src/components/business/BusinessShell.tsx`)

Componente cliente que arma la estructura: barra lateral fija + top bar + área de contenido con scroll.

- **Datos:** obtiene el nombre del negocio con `apiGet('/businesses/:id')` (usando `useParams` para el `id`). Muestra un placeholder mientras carga.
- **Ítems de navegación:** definidos en un helper `getBusinessNavItems(id)` que devuelve `{ href, label, icon }[]` con: Resumen (`/empresas/[id]`), Facturas, Clientes, Productos, Cotizaciones, Proveedores, Órd. de compra, Listas de precios, Reportes, Equipo, y **Vender** (`/empresas/[id]/vender`). Reutiliza los mismos iconos de lucide ya usados en el dashboard.
- **Estado activo:** con `usePathname`, resalta el ítem cuyo `href` coincide con la ruta actual (para "Resumen" solo coincide si la ruta es exactamente `/empresas/[id]`). Acento violeta (paleta del módulo empresas).
- **Top bar:** nombre del negocio, botón "← Mis empresas" (`/empresas`), `ThemeToggle` y `UserMenu`. En móvil incluye el botón hamburguesa que abre/cierra el cajón.
- **Responsive:**
  - **Desktop (`md+`):** barra lateral fija a la izquierda (ancho ~256px), contenido a la derecha.
  - **Móvil:** la barra se oculta y se abre como cajón (overlay) con el botón hamburguesa; se cierra al elegir un ítem o al tocar el overlay.
- No incluye `WorkspaceSwitcher` en el top bar del shell (para no competir con la navegación del negocio); el retorno al módulo se hace vía "← Mis empresas". (El `WorkspaceSwitcher` global sigue disponible desde el dashboard del negocio y demás.)

### `(shell)/layout.tsx`

```tsx
import { type ReactNode } from 'react';
import { BusinessShell } from '@/components/business/BusinessShell';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <BusinessShell>{children}</BusinessShell>;
}
```

### `(shell)/vender/page.tsx` — stub

Pantalla simple centrada: icono, título "Vender", texto "Próximamente — estamos construyendo el punto de venta." Renderiza solo contenido (el shell aporta la barra y el top bar).

## Refactor de las páginas de función

Cada página de función hoy renderiza su propia pantalla completa: un `<div className="min-h-screen ...">` con un encabezado propio (típicamente un `<Link>` con flecha "atrás" hacia el dashboard + `ThemeToggle`, a veces el `Logo`/`UserMenu`).

Para cada una de las 9 páginas:
- Quitar la envoltura `min-h-screen` de pantalla completa y el **encabezado propio** (flecha atrás, ThemeToggle suelto, etc.) — esa función la asume el shell.
- Conservar TODO el contenido funcional (formularios, tablas, modales, lógica de datos) intacto.
- El contenedor raíz de la página pasa a ser un contenedor de contenido normal (ej. `<div className="p-4 sm:p-6 ...">` o el `<main>` que ya tuviera), sin barra de navegación propia.
- No se cambia ninguna llamada a API ni lógica de negocio: es puramente reacomodo de layout.

Como cada página tiene su propia estructura de encabezado, el refactor se hace **una página por tarea** para revisarlas de forma aislada.

## Dashboard del negocio (`[id]/page.tsx`)

Sin cambios funcionales. Mantiene su encabezado actual (Logo, WorkspaceSwitcher, Import Excel, UserMenu), los KPIs y la cuadrícula de módulos. La cuadrícula sigue navegando a cada función (que ahora abre con barra lateral). Se mantiene "ambos" (cuadros + barra) según lo pedido: cuadros al entrar, barra al elegir función.

## Casos borde

- **Ruta activa "Resumen":** debe resaltarse solo en `/empresas/[id]` exacto, no en las subrutas (que empiezan con ese prefijo).
- **Cajón móvil:** cerrar al navegar y al tocar el overlay; bloquear scroll del fondo mientras esté abierto es opcional (no requerido).
- **Carga del nombre del negocio:** si falla, mostrar "Empresa" como fallback (mismo patrón que el dashboard actual).
- **PlanGate/UpgradeModal:** siguen funcionando porque `[id]/layout.tsx` (providers) envuelve el grupo.

## Verificación

Patrón del proyecto: `npx tsc --noEmit` por tarea + prueba manual (entrar al negocio → ver cuadros; entrar a una función → ver barra lateral; navegar entre funciones sin volver al dashboard; probar el cajón en móvil; "Vender" muestra "Próximamente"). Sin tests unitarios.

## Fuera de alcance (YAGNI)

- La feature real de "Vender" / POS (proyecto aparte).
- Barra lateral en el dashboard del negocio (a propósito no la lleva).
- Cambios de backend.
- Rediseño visual de las páginas de función más allá de quitarles el encabezado propio.
