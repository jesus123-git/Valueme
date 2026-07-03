# Rebrand ValueMe + Onboarding con preferencias — Diseño

## Goal

Renombrar la app de **Nomi → ValueMe** en toda la interfaz, y añadir un flujo de bienvenida + onboarding que se ejecuta una sola vez por cuenta: pregunta cómo llamar al usuario, qué módulo(s) usar (personal / empresas / ambos) y su moneda principal. Según el módulo elegido, se oculta el otro (rehabilitable desde Configuración).

## Parte 0 — Rebrand Nomi → ValueMe

Reemplazar las ~33 apariciones de "Nomi"/"NOMI" por **"ValueMe"** en el código fuente (UI, logo, textos, comentarios visibles) y en docs de cara al usuario (README, CONTEXT.md).

**NO se tocan** identificadores internos: `finanzas_token` (localStorage), `finanzas_session` (cookie), nombres de carpetas, nombre del repo, ni el regex de CORS de Vercel. Solo la marca visible.

Archivos afectados conocidos (fuente): `backend/src/main.ts`, `backend/src/modules/business-members/business-members.service.ts`, `frontend/src/app/layout.tsx`, `frontend/src/app/(dashboard)/planes/page.tsx`, `frontend/src/app/(dashboard)/empresas/[id]/listas-precios/page.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/components/ui/UsageCard.tsx`, `UpgradeModal.tsx`, `Button.tsx`, `WorkspaceSwitcher.tsx`, `Logo.tsx`, `frontend/src/components/dashboard/SummaryCards.tsx`. (Se hará un grep final para no dejar ninguna.)

## Parte 1 — Modelo de datos

### Enum nuevo
```prisma
enum ModulePreference {
  PERSONAL
  BUSINESS
  BOTH
}
```

### Campos nuevos en `User`
```prisma
onboardingCompletedAt DateTime?
modulePreference      ModulePreference @default(BOTH)
primaryCurrency       String           @default("COP")
```

- `onboardingCompletedAt`: `null` = el usuario aún no completó el onboarding. Es la llave que dispara el asistente una sola vez.
- El "cómo quieres que te llamemos" se guarda en el campo **`name`** ya existente (es el display name que muestra el `UserMenu`). No se duplica.

Migración: `add_onboarding_preferences`.

### Exposición al frontend
`onboardingCompletedAt`, `modulePreference` y `primaryCurrency` se incluyen en el objeto `user` devuelto por `/auth/me`, `login`, `register` y `/auth/google` (mismo `select` + `buildTokenResponse`). El tipo `User` del frontend se amplía con estos tres campos.

## Parte 2 — Backend

### `PATCH /auth/onboarding` (protegido)
Body `{ name?: string; modulePreference: ModulePreference; primaryCurrency: string }`.
- Actualiza `name`, `modulePreference`, `primaryCurrency` y setea `onboardingCompletedAt = new Date()`.
- Devuelve el `user` actualizado (mismo shape que las otras respuestas de auth).
- DTO con `class-validator`: `modulePreference` `@IsEnum(ModulePreference)`, `primaryCurrency` `@IsString`, `name` opcional.

### `PATCH /auth/preferences` (protegido)
Body `{ name?: string; modulePreference?: ModulePreference; primaryCurrency?: string }`.
- Actualiza solo los campos presentes. NO toca `onboardingCompletedAt`.
- Para uso desde Configuración (cambiar módulo/moneda/nombre después).
- Devuelve el `user` actualizado.

Ambos métodos viven en `AuthService` y se exponen en `AuthController` con `@UseGuards(JwtAuthGuard)`.

## Parte 3 — Frontend: flujo

### Splash de bienvenida (público, ruta `/`)
Hoy `/` es un `redirect('/personal')` server-side. Se convierte en un **client component** (splash):
- Logo ValueMe + frase de bienvenida + botones "Iniciar sesión" (`/login`) y "Crear cuenta" (`/register`).
- Si hay sesión activa (hay user): redirige al módulo preferido (ver "Redirección post-login").
- Diseño: splash simple, centrado, con `ThemeToggle`, coherente con las páginas de login/register.

### Asistente de onboarding (ruta `/onboarding`, protegida)
Wizard multi-paso con barra de progreso. Los pasos se definen como un **array de configuración** para poder añadir pasos futuros sin reescribir el componente. Pasos iniciales:
1. **Nombre**: "¿Cómo quieres que te llamemos?" → input de texto (prellenado con `user.name` si existe, ej. de Google). Guarda en `name`.
2. **Módulo**: tres tarjetas seleccionables — Personal / Empresas / Ambos.
3. **Moneda**: selector de moneda principal (usa la lista de `frontend/src/lib/currencies.ts`), default COP.

Al finalizar: `PATCH /auth/onboarding` con los tres valores → actualiza el user en el AuthContext → redirige al módulo preferido.

Guard de la ruta: si `user.onboardingCompletedAt` ya tiene valor, `/onboarding` redirige al dashboard (no se repite).

### Redirección post-login / post-registro
Tras `login` / `register` / `loginWithGoogle`:
- Si `user.onboardingCompletedAt` es null → `router.push('/onboarding')`.
- Si no → al módulo preferido: `PERSONAL`/`BOTH` → `/personal`; `BUSINESS` → `/empresas`.

(Se centraliza en un helper `moduleHomePath(user)` para reutilizar.)

## Parte 4 — Ocultar / mostrar módulos

### WorkspaceContext
Lee `user.modulePreference` (vía `useAuth`) y expone:
- `availableModules: WorkspaceMode[]` — `['personal']`, `['empresas']`, o ambos.
- El `WorkspaceSwitcher` solo renderiza las opciones disponibles; si solo hay una, el switcher no se muestra (o muestra una etiqueta estática sin dropdown).

### Guard de módulo (en `(dashboard)/layout.tsx`)
Componente cliente que, al cargar user:
- Si `onboardingCompletedAt` es null y la ruta no es `/onboarding` → redirige a `/onboarding`.
- Si la ruta pertenece a un módulo deshabilitado (ej. `/empresas...` con `modulePreference = PERSONAL`) → redirige al módulo habilitado.
- Mientras `loading` es true, no hace nada (evita redirecciones prematuras).

El gating es **client-side** a propósito: el token vive en localStorage y las preferencias no están en la cookie espejo que lee el middleware Edge. Consistente con el patrón actual de la app. Puede haber un breve flash antes del redirect; aceptable.

### Configuración
Nueva tarjeta "Módulos y preferencias" en `/configuracion`:
- Selector de módulo (personal / empresas / ambos) → rehabilita lo oculto.
- Selector de moneda principal.
- Edición del nombre para mostrar.
- Guarda con `PATCH /auth/preferences` y actualiza el user en el AuthContext.

## Casos borde

- **Usuarios de Google**: `onboardingCompletedAt` null al crearse → pasan por el onboarding con el nombre prellenado.
- **Usuarios existentes** (ya en la BD): `onboardingCompletedAt` null → verán el onboarding una vez en su próximo login. Aceptable (pre-lanzamiento) y deseable para que fijen su preferencia.
- **Default `BOTH`** garantiza que, si por cualquier motivo no se completó el onboarding, se ven ambos módulos (no se bloquea al usuario).
- **Migración en producción**: se aplica con `prisma migrate deploy` (el entorno local no permite `migrate dev` interactivo; se genera con `migrate diff`).

## Verificación

Patrón del proyecto: `npx tsc --noEmit` por cambio + prueba manual del flujo (splash → registro → onboarding → módulo correcto; cambio de preferencia en Configuración; ocultamiento del módulo). Sin tests unitarios (no hay suite para estas features).

## Fuera de alcance (YAGNI)

- Preguntas de encuesta más allá de nombre/módulo/moneda (el asistente queda extensible para añadirlas luego).
- Landing page completa de marketing (solo splash simple por ahora).
- Migrar preferencias al JWT (se leen vía `/auth/me`, suficiente).
