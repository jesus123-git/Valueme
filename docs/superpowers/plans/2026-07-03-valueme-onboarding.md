# Rebrand ValueMe + Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar Nomi → ValueMe en la UI y añadir un flujo de bienvenida + onboarding (una vez por cuenta) que captura nombre, módulo(s) preferido(s) y moneda, ocultando el módulo no elegido (rehabilitable en Configuración).

**Architecture:** Nuevos campos en `User` (`onboardingCompletedAt`, `modulePreference`, `primaryCurrency`) expuestos vía `/auth/me` y respuestas de auth. Dos endpoints `PATCH` (`/auth/onboarding`, `/auth/preferences`). En el frontend: splash público en `/`, asistente `/onboarding` con pasos configurables, y gating client-side en el layout del dashboard + filtrado del WorkspaceSwitcher.

**Tech Stack:** NestJS + Prisma + PostgreSQL, Next.js 14 App Router, Tailwind, TanStack Query.

**Ruta del proyecto:** `/Users/sebastiansalgado/finanzas` (monorepo `backend/` + `frontend/`).

**Verificación:** `npx tsc --noEmit` por tarea + prueba manual. Sin tests unitarios (no hay suite para estas features).

**Mapeos de referencia (usar consistentemente):**
- `ModulePreference` (backend enum / frontend type): `'PERSONAL' | 'BUSINESS' | 'BOTH'`.
- `WorkspaceMode` (ya existe): `'personal' | 'empresas'`.
- `moduleHomePath(user)`: `BUSINESS → '/empresas'`, en otro caso `'/personal'`.
- `availableModules`: `BOTH → ['personal','empresas']`; `PERSONAL → ['personal']`; `BUSINESS → ['empresas']`.

---

### Task 1: Rebrand Nomi → ValueMe

**Files:**
- Modify: `frontend/src/components/ui/Logo.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: (todas las apariciones restantes de "Nomi"/"NOMI" en `backend/src` y `frontend/src`)

- [ ] **Step 1: Actualizar el Logo**

En `frontend/src/components/ui/Logo.tsx`:
- En `LogoMark`, cambiar la letra del isotipo de `n` a `V`:
```tsx
      >
        V
      </span>
```
- En `Logo`, cambiar el wordmark de `NOMI` a `ValueMe`:
```tsx
        <span
          className="font-display font-bold tracking-[0.02em] text-slate-900 dark:text-white leading-none"
          style={{ fontSize: size * 0.56 }}
        >
          ValueMe
        </span>
```
- En el `<Link aria-label=...>` cambiar `"NOMI — inicio"` por `"ValueMe — inicio"`.

- [ ] **Step 2: Actualizar metadata del layout raíz**

En `frontend/src/app/layout.tsx`, reemplazar el bloque `metadata`:
```tsx
export const metadata: Metadata = {
  title: { default: 'ValueMe — Finanzas con claridad', template: '%s | ValueMe' },
  description: 'ValueMe: la plataforma financiera para personas y negocios en Colombia',
};
```

- [ ] **Step 3: Reemplazar el resto de apariciones**

Listar todas las apariciones restantes:
```bash
cd /Users/sebastiansalgado/finanzas
grep -rniI "nomi" --include="*.ts" --include="*.tsx" backend/src frontend/src | grep -v node_modules
```
Para cada aparición, reemplazar respetando el estilo del texto circundante:
- En texto de UI / títulos / copys → `ValueMe`.
- En `NOMI` (mayúsculas en comentarios o labels) → `ValueMe`.
- En comentarios que digan "teal NOMI" o similar → `ValueMe`.

**NO reemplazar** las cadenas `finanzas_token`, `finanzas_session`, ni el regex de CORS de Vercel (`nomi-s-projects4`) en `backend/src/main.ts` — ese subdominio es un identificador de infraestructura real de Vercel, no marca. Si lo encuentras, **déjalo** y anótalo en el reporte.

- [ ] **Step 4: Verificar que no queden apariciones de marca**

```bash
cd /Users/sebastiansalgado/finanzas
grep -rniI "nomi" --include="*.ts" --include="*.tsx" backend/src frontend/src | grep -v node_modules | grep -vi "nomi-s-projects4"
```
Expected: sin resultados (salvo, si aplica, el subdominio de CORS que se dejó a propósito).

- [ ] **Step 5: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "backend: $?"
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "frontend: $?"
```
Expected: ambos `0`.

- [ ] **Step 6: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add -A backend/src frontend/src
git commit -m "feat(brand): rename Nomi to ValueMe across the UI"
```

---

### Task 2: Esquema Prisma — ModulePreference + campos de onboarding

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Añadir el enum ModulePreference**

En `backend/prisma/schema.prisma`, junto a los otros enums (después de `enum PlanType { ... }`), añadir:
```prisma
enum ModulePreference {
  PERSONAL
  BUSINESS
  BOTH
}
```

- [ ] **Step 2: Añadir campos al modelo User**

En el modelo `User`, tras la línea `planStartedAt DateTime?` (y junto a los campos de plan), añadir:
```prisma
  onboardingCompletedAt DateTime?
  modulePreference      ModulePreference @default(BOTH)
  primaryCurrency       String           @default("COP")
```

- [ ] **Step 3: Generar la migración (entorno no interactivo)**

`prisma migrate dev` no funciona en este entorno (requiere TTY). Generar la migración con `migrate diff` y regenerar el client:
```bash
cd /Users/sebastiansalgado/finanzas/backend
TS=$(date +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_add_onboarding_preferences
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/${TS}_add_onboarding_preferences/migration.sql 2>&1
cat prisma/migrations/${TS}_add_onboarding_preferences/migration.sql
npx prisma generate 2>&1; echo "exit: $?"
```
Expected: `migration.sql` contiene `CREATE TYPE "ModulePreference"`, y `ALTER TABLE "users" ADD COLUMN "onboardingCompletedAt"`, `"modulePreference"`, `"primaryCurrency"`. `prisma generate` termina en `exit: 0`.

> Nota: `migrate diff --from-schema-datasource` compara la BD real contra el datamodel. Si la BD local no está sincronizada, revisa que el SQL solo contenga los cambios de esta tarea; si incluye ruido de migraciones previas no aplicadas, usa en su lugar `--from-migrations prisma/migrations` como `--from`. Reporta qué usaste.

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(onboarding): add ModulePreference enum and onboarding fields to User"
```

---

### Task 3: Backend — exponer los nuevos campos en las respuestas de auth

**Files:**
- Modify: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Incluir los campos en jwt.strategy.validate**

En `backend/src/modules/auth/strategies/jwt.strategy.ts`, en el `select` de `validate()`, añadir los tres campos:
```typescript
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, plan: true, isStaff: true,
        onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
      },
    });
```

- [ ] **Step 2: Ampliar buildTokenResponse en auth.service.ts**

En `backend/src/modules/auth/auth.service.ts`, cambiar la firma y el retorno de `buildTokenResponse` para incluir los nuevos campos:
```typescript
  private buildTokenResponse(user: {
    id: string;
    email: string;
    name: string | null;
    plan: import('@prisma/client').PlanType;
    isStaff: boolean;
    onboardingCompletedAt: Date | null;
    modulePreference: import('@prisma/client').ModulePreference;
    primaryCurrency: string;
  }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isStaff: user.isStaff,
        onboardingCompletedAt: user.onboardingCompletedAt,
        modulePreference: user.modulePreference,
        primaryCurrency: user.primaryCurrency,
      },
    };
  }
```

- [ ] **Step 3: Actualizar los `select` que alimentan buildTokenResponse**

En `auth.service.ts`, en cada uno de estos lugares, ampliar el `select` para incluir `onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true`:

1. En `register()` — el `select` del `prisma.user.create`.
2. En `login()` — el `select` del `prisma.user.findUnique` (mantiene también `passwordHash: true`), y al llamar `buildTokenResponse` pasar los nuevos campos:
```typescript
    return this.buildTokenResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      isStaff: user.isStaff,
      onboardingCompletedAt: user.onboardingCompletedAt,
      modulePreference: user.modulePreference,
      primaryCurrency: user.primaryCurrency,
    });
```
3. En `googleLogin()` — tanto el `select` del `findUnique` (rama "existing", que además ya tiene `googleId: true`) como el `select` del `create` (rama nueva). En la rama "existing", al llamar `buildTokenResponse`, pasar también los tres campos nuevos desde `existing`.

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add backend/src/modules/auth/strategies/jwt.strategy.ts backend/src/modules/auth/auth.service.ts
git commit -m "feat(onboarding): expose onboarding fields in auth responses"
```

---

### Task 4: Backend — endpoints de onboarding y preferencias

**Files:**
- Create: `backend/src/modules/auth/dto/onboarding.dto.ts`
- Create: `backend/src/modules/auth/dto/preferences.dto.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Crear los DTOs**

`backend/src/modules/auth/dto/onboarding.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModulePreference } from '@prisma/client';

export class OnboardingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ enum: ModulePreference })
  @IsEnum(ModulePreference)
  modulePreference: ModulePreference;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(8)
  primaryCurrency: string;
}
```

`backend/src/modules/auth/dto/preferences.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModulePreference } from '@prisma/client';

export class PreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ModulePreference })
  @IsOptional()
  @IsEnum(ModulePreference)
  modulePreference?: ModulePreference;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  primaryCurrency?: string;
}
```

- [ ] **Step 2: Añadir métodos al AuthService**

En `auth.service.ts`, añadir estos dos métodos (por ejemplo tras `changePassword`). Reutilizan un `select` compartido; define una constante privada de clase para DRY:
```typescript
  // Campos que el frontend necesita del usuario tras cualquier cambio de perfil/preferencias
  private readonly userSelect = {
    id: true, email: true, name: true, plan: true, isStaff: true,
    onboardingCompletedAt: true, modulePreference: true, primaryCurrency: true,
  } as const;

  async completeOnboarding(
    userId: string,
    dto: { name?: string; modulePreference: import('@prisma/client').ModulePreference; primaryCurrency: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        modulePreference: dto.modulePreference,
        primaryCurrency: dto.primaryCurrency,
        onboardingCompletedAt: new Date(),
      },
      select: this.userSelect,
    });
  }

  async updatePreferences(
    userId: string,
    dto: {
      name?: string;
      modulePreference?: import('@prisma/client').ModulePreference;
      primaryCurrency?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.modulePreference !== undefined && { modulePreference: dto.modulePreference }),
        ...(dto.primaryCurrency !== undefined && { primaryCurrency: dto.primaryCurrency }),
      },
      select: this.userSelect,
    });
  }
```

- [ ] **Step 3: Añadir endpoints al AuthController**

En `auth.controller.ts`, importar los DTOs:
```typescript
import { OnboardingDto } from './dto/onboarding.dto';
import { PreferencesDto } from './dto/preferences.dto';
```
Y añadir (tras `changePassword`):
```typescript
  // ─── PATCH /api/v1/auth/onboarding ────────────────────────────────────────

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar el onboarding inicial del usuario' })
  completeOnboarding(
    @CurrentUser() user: { id: string },
    @Body() dto: OnboardingDto,
  ) {
    return this.authService.completeOnboarding(user.id, dto);
  }

  // ─── PATCH /api/v1/auth/preferences ───────────────────────────────────────

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar preferencias (módulo, moneda, nombre)' })
  updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: PreferencesDto,
  ) {
    return this.authService.updatePreferences(user.id, dto);
  }
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add backend/src/modules/auth/dto/onboarding.dto.ts backend/src/modules/auth/dto/preferences.dto.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.controller.ts
git commit -m "feat(onboarding): add PATCH /auth/onboarding and /auth/preferences endpoints"
```

---

### Task 5: Frontend — tipos, helper moduleHomePath y métodos del AuthContext

**Files:**
- Modify: `frontend/src/types/auth.types.ts`
- Create: `frontend/src/lib/modules.ts`
- Modify: `frontend/src/context/auth.context.tsx`

- [ ] **Step 1: Ampliar el tipo User y el contexto**

En `frontend/src/types/auth.types.ts`:
```typescript
export type ModulePreference = 'PERSONAL' | 'BUSINESS' | 'BOTH';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'EMPRESA';
  isStaff: boolean;
  onboardingCompletedAt: string | null;
  modulePreference: ModulePreference;
  primaryCurrency: string;
}
```
Y añadir al `AuthContextValue` (tras `loginWithGoogle`):
```typescript
  completeOnboarding: (payload: {
    name?: string;
    modulePreference: ModulePreference;
    primaryCurrency: string;
  }) => Promise<void>;
  updatePreferences: (payload: {
    name?: string;
    modulePreference?: ModulePreference;
    primaryCurrency?: string;
  }) => Promise<void>;
```

- [ ] **Step 2: Crear el helper de módulos**

`frontend/src/lib/modules.ts`:
```typescript
import type { ModulePreference, User } from '@/types/auth.types';
import type { WorkspaceMode } from '@/context/workspace.context';

/** Ruta de inicio según la preferencia de módulo. */
export function moduleHomePath(user: Pick<User, 'modulePreference'>): string {
  return user.modulePreference === 'BUSINESS' ? '/empresas' : '/personal';
}

/** Módulos habilitados según la preferencia. */
export function availableModules(pref: ModulePreference): WorkspaceMode[] {
  if (pref === 'PERSONAL') return ['personal'];
  if (pref === 'BUSINESS') return ['empresas'];
  return ['personal', 'empresas'];
}

/** true si la ruta pertenece a un módulo NO habilitado. */
export function isModuleBlocked(pathname: string, pref: ModulePreference): boolean {
  const mods = availableModules(pref);
  if (pathname.startsWith('/empresas')) return !mods.includes('empresas');
  if (pathname.startsWith('/personal')) return !mods.includes('personal');
  return false;
}
```

- [ ] **Step 3: Actualizar AuthContext (redirecciones + nuevos métodos)**

En `frontend/src/context/auth.context.tsx`:
- Importar el helper y `apiPatch`:
```typescript
import { apiGet, apiPost, apiPatch, getToken, removeToken, setToken } from '@/lib/api';
import { moduleHomePath } from '@/lib/modules';
```
- Crear un helper interno de redirección post-auth y usarlo en `login`, `register` y `loginWithGoogle` en lugar de `router.push('/dashboard')`:
```typescript
  const redirectAfterAuth = useCallback((u: User) => {
    if (!u.onboardingCompletedAt) router.push('/onboarding');
    else router.push(moduleHomePath(u));
  }, [router]);
```
  En `login`: reemplazar `router.push('/dashboard');` por `redirectAfterAuth(data.user);`. Igual en `register` y `loginWithGoogle`. (Añadir `redirectAfterAuth` a los deps de esos `useCallback`.)
- Añadir los métodos `completeOnboarding` y `updatePreferences` (tras `loginWithGoogle`):
```typescript
  const completeOnboarding = useCallback(async (payload: {
    name?: string; modulePreference: User['modulePreference']; primaryCurrency: string;
  }) => {
    const updated = await apiPatch<User>('/auth/onboarding', payload);
    setUser(updated);
    router.push(moduleHomePath(updated));
  }, [router]);

  const updatePreferences = useCallback(async (payload: {
    name?: string; modulePreference?: User['modulePreference']; primaryCurrency?: string;
  }) => {
    const updated = await apiPatch<User>('/auth/preferences', payload);
    setUser(updated);
  }, []);
```
- Añadir ambos al `value` del Provider:
```typescript
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, completeOnboarding, updatePreferences, logout }}>
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/types/auth.types.ts frontend/src/lib/modules.ts frontend/src/context/auth.context.tsx
git commit -m "feat(onboarding): add module helpers and onboarding methods to AuthContext"
```

---

### Task 6: Frontend — splash de bienvenida en `/`

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Convertir la raíz en splash cliente**

Reemplazar todo el contenido de `frontend/src/app/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/app/page.tsx
git commit -m "feat(onboarding): add ValueMe welcome splash at root"
```

---

### Task 7: Frontend — asistente de onboarding `/onboarding`

**Files:**
- Create: `frontend/src/app/onboarding/page.tsx`

- [ ] **Step 1: Crear el asistente**

Crear `frontend/src/app/onboarding/page.tsx`. Los pasos se definen como un array (`STEPS`) para ser extensible; el estado avanza por índice.
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth.context';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CURRENCIES } from '@/lib/currencies';
import type { ModulePreference } from '@/types/auth.types';

type StepId = 'name' | 'module' | 'currency';
const STEPS: StepId[] = ['name', 'module', 'currency'];

const MODULE_OPTIONS: { value: ModulePreference; label: string; desc: string; icon: typeof User }[] = [
  { value: 'PERSONAL', label: 'Solo personal',  desc: 'Cuentas, gastos y ahorro',          icon: User },
  { value: 'BUSINESS', label: 'Solo empresas',  desc: 'Facturas, clientes y reportes',     icon: Building2 },
  { value: 'BOTH',     label: 'Ambos',          desc: 'Gestiona lo personal y tu negocio', icon: Sparkles },
];

export default function OnboardingPage() {
  const { user, loading, completeOnboarding } = useAuth();
  const router = useRouter();

  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [modulePreference, setModulePreference] = useState<ModulePreference>('BOTH');
  const [currency, setCurrency] = useState('COP');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prellenar el nombre y saltar si ya se completó el onboarding.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.onboardingCompletedAt) { router.replace('/personal'); return; }
    if (user.name) setName(user.name);
    if (user.primaryCurrency) setCurrency(user.primaryCurrency);
    if (user.modulePreference) setModulePreference(user.modulePreference);
  }, [user, loading, router]);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const progress = useMemo(() => ((stepIdx + 1) / STEPS.length) * 100, [stepIdx]);

  const canAdvance =
    step === 'name' ? name.trim().length > 0 :
    step === 'currency' ? currency.length > 0 :
    true;

  async function handleNext() {
    setError('');
    if (!isLast) { setStepIdx(i => i + 1); return; }
    setSaving(true);
    try {
      await completeOnboarding({ name: name.trim() || undefined, modulePreference, primaryCurrency: currency });
      // completeOnboarding redirige al módulo preferido
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar tus preferencias');
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={44} href={null} /></div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          {/* Barra de progreso */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 mb-6 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {step === 'name' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Cómo quieres que te llamemos?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Puedes usar tu nombre o un apodo.</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre o apodo"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
              />
            </div>
          )}

          {step === 'module' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Qué quieres gestionar?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Podrás cambiarlo luego en Configuración.</p>
              <div className="flex flex-col gap-2 mt-1">
                {MODULE_OPTIONS.map(opt => {
                  const active = modulePreference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setModulePreference(opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <opt.icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-white">{opt.label}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'currency' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">¿Cuál es tu moneda principal?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">La usaremos para mostrar tus cifras.</p>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.country})</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-500 dark:text-red-400 mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            {stepIdx > 0 && (
              <button
                onClick={() => { setError(''); setStepIdx(i => i - 1); }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition"
              >
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance || saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition"
            >
              {saving ? 'Guardando…' : isLast ? 'Empezar' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/app/onboarding/page.tsx
git commit -m "feat(onboarding): add onboarding wizard with configurable steps"
```

---

### Task 8: Frontend — gating de módulos (WorkspaceContext + Switcher + layout guard)

**Files:**
- Modify: `frontend/src/context/workspace.context.tsx`
- Modify: `frontend/src/components/ui/WorkspaceSwitcher.tsx`
- Create: `frontend/src/components/ui/ModuleGuard.tsx`
- Modify: `frontend/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Exponer availableModules en WorkspaceContext**

En `frontend/src/context/workspace.context.tsx`:
- Importar auth y helper:
```typescript
import { useAuth } from '@/context/auth.context';
import { availableModules as computeAvailable } from '@/lib/modules';
```
- Añadir `available: WorkspaceMode[]` a `WorkspaceContextValue`:
```typescript
  available: WorkspaceMode[];
```
- En `WorkspaceProvider`, calcularlo desde el user (default a ambos si no hay user aún):
```typescript
  const { user } = useAuth();
  const available: WorkspaceMode[] = user ? computeAvailable(user.modulePreference) : ['personal', 'empresas'];
```
- Incluir `available` en el `value` del Provider.

- [ ] **Step 2: Filtrar el WorkspaceSwitcher**

En `frontend/src/components/ui/WorkspaceSwitcher.tsx`:
- Leer `available` del contexto: `const { mode, setMode, available } = useWorkspace();`
- Filtrar las opciones visibles:
```typescript
  const visibleOptions = OPTIONS.filter(o => available.includes(o.value));
```
- Si solo hay una opción disponible, no renderizar el dropdown (retornar `null` o una etiqueta estática). Añadir al inicio del `return`, antes del JSX del dropdown:
```typescript
  if (visibleOptions.length <= 1) return null;
```
- Usar `visibleOptions` en lugar de `OPTIONS` dentro del `.map` del dropdown.

- [ ] **Step 3: Crear ModuleGuard**

`frontend/src/components/ui/ModuleGuard.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth.context';
import { isModuleBlocked, moduleHomePath } from '@/lib/modules';

// Gating client-side: fuerza onboarding y bloquea módulos no habilitados.
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;
    // 1. Onboarding pendiente → al asistente
    if (!user.onboardingCompletedAt) {
      router.replace('/onboarding');
      return;
    }
    // 2. Ruta de un módulo deshabilitado → al módulo habilitado
    if (isModuleBlocked(pathname, user.modulePreference)) {
      router.replace(moduleHomePath(user));
    }
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Envolver el layout del dashboard con ModuleGuard**

En `frontend/src/app/(dashboard)/layout.tsx`:
```tsx
import { type ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/workspace.context';
import { ModuleGuard } from '@/components/ui/ModuleGuard';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ModuleGuard>
        {children}
      </ModuleGuard>
    </WorkspaceProvider>
  );
}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 6: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/context/workspace.context.tsx frontend/src/components/ui/WorkspaceSwitcher.tsx frontend/src/components/ui/ModuleGuard.tsx "frontend/src/app/(dashboard)/layout.tsx"
git commit -m "feat(onboarding): gate hidden modules via WorkspaceContext and ModuleGuard"
```

---

### Task 9: Frontend — tarjeta "Módulos y preferencias" en Configuración

**Files:**
- Create: `frontend/src/components/settings/PreferencesCard.tsx`
- Modify: `frontend/src/app/(dashboard)/configuracion/page.tsx`

- [ ] **Step 1: Crear la tarjeta de preferencias**

`frontend/src/components/settings/PreferencesCard.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '@/context/auth.context';
import { CURRENCIES } from '@/lib/currencies';
import type { ModulePreference } from '@/types/auth.types';

const MODULES: { value: ModulePreference; label: string }[] = [
  { value: 'PERSONAL', label: 'Solo personal' },
  { value: 'BUSINESS', label: 'Solo empresas' },
  { value: 'BOTH',     label: 'Ambos' },
];

export function PreferencesCard() {
  const { user, updatePreferences } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [modulePreference, setModulePreference] = useState<ModulePreference>(user?.modulePreference ?? 'BOTH');
  const [currency, setCurrency] = useState(user?.primaryCurrency ?? 'COP');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await updatePreferences({ name: name.trim() || undefined, modulePreference, primaryCurrency: currency });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Módulos y preferencias</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Elige qué módulos ver, tu moneda y cómo te llamamos.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Nombre para mostrar</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre o apodo"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">Módulos activos</label>
        <div className="flex gap-2">
          {MODULES.map(m => {
            const active = modulePreference === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setModulePreference(m.value)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Moneda principal</label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-sm"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.country})</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-2"
      >
        {saved ? <><Check size={15} /> Guardado</> : saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Añadir la tarjeta a la página de Configuración**

En `frontend/src/app/(dashboard)/configuracion/page.tsx`, importar y renderizar la tarjeta dentro del `<main>`, antes de `<EmailConfigCard />`:
```tsx
import { PreferencesCard } from '@/components/settings/PreferencesCard';
```
```tsx
      <main className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
        <PreferencesCard />
        <EmailConfigCard />
      </main>
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 4: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add frontend/src/components/settings/PreferencesCard.tsx "frontend/src/app/(dashboard)/configuracion/page.tsx"
git commit -m "feat(onboarding): add module & preferences card to settings"
```

---

### Task 10: Verificación final, push y migración en producción

**Files:** ninguno (verificación y despliegue)

- [ ] **Step 1: Compilación final de ambos proyectos**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "backend: $?"
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "frontend: $?"
```
Expected: ambos `0`.

- [ ] **Step 2: Prueba manual local**

Con backend (`npm run start:dev`) y frontend (`npm run dev`) corriendo:
1. Ir a `/` (logout) → ver el splash ValueMe con los dos botones.
2. Crear una cuenta nueva → debe abrir `/onboarding` con los 3 pasos.
3. Elegir "Solo personal" + una moneda → al terminar entra a `/personal`; el WorkspaceSwitcher NO aparece (solo un módulo) y `/empresas` redirige a `/personal`.
4. En `/configuracion` cambiar a "Ambos" → el switcher reaparece y `/empresas` es accesible.
5. Cerrar sesión y volver a entrar → NO se repite el onboarding.
6. Verificar que en toda la UI aparece "ValueMe" (no "Nomi").

Expected: el flujo completo funciona y las preferencias persisten.

- [ ] **Step 3: Push**

```bash
cd /Users/sebastiansalgado/finanzas
git push origin main
```

- [ ] **Step 4: Migración en producción**

En la consola del servicio backend en Railway:
```bash
npx prisma migrate deploy
```
Expected: aplica `add_onboarding_preferences` sin errores.

- [ ] **Step 5: Smoke test en producción**

Abrir la URL de Vercel, registrar/entrar y confirmar el splash + onboarding + gating end-to-end.

---

## Self-Review

- **Cobertura del spec:**
  - Rebrand → Task 1. ✅
  - Modelo de datos (enum + 3 campos) → Task 2. ✅
  - Exposición de campos en auth → Task 3. ✅
  - Endpoints onboarding/preferences → Task 4. ✅
  - Tipos frontend + helpers + AuthContext redirects/métodos → Task 5. ✅
  - Splash → Task 6. ✅
  - Asistente extensible → Task 7. ✅
  - Ocultar módulos (WorkspaceContext + Switcher + guard) → Task 8. ✅
  - Configuración (rehabilitar) → Task 9. ✅
  - Verificación + deploy → Task 10. ✅
- **Consistencia de tipos:** `ModulePreference` = `'PERSONAL'|'BUSINESS'|'BOTH'` en backend (enum Prisma) y frontend (type). `moduleHomePath`, `availableModules`, `isModuleBlocked` definidos en Task 5 (`lib/modules.ts`) y consumidos en Tasks 6, 7, 8. `completeOnboarding`/`updatePreferences` definidos en el tipo (Task 5) e implementados en el mismo AuthContext (Task 5); consumidos en Tasks 7 y 9. `available` añadido al WorkspaceContext (Task 8) y consumido por el Switcher (Task 8). ✅
- **Sin placeholders:** todos los pasos con cambios de código incluyen el código completo. ✅
- **Dependencia entre tareas:** el orden 1→10 respeta dependencias (schema antes que servicio; tipos/helpers antes que UI que los usa). ✅
