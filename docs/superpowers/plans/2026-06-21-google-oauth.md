# Login con Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir acceso a Nomi con cuenta de Google (flujo ID token), vinculando automáticamente por email a cuentas existentes.

**Architecture:** El frontend usa Google Identity Services para obtener un ID token, lo envía a `POST /auth/google`, y el backend lo verifica con `google-auth-library`, vincula o crea el usuario, y emite el JWT propio de Nomi. `passwordHash` pasa a opcional y se añade `googleId` al modelo `User`.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 14 App Router (frontend), google-auth-library, Google Identity Services.

**Verificación:** Este codebase no usa tests unitarios para estas features; se verifica con `npx tsc --noEmit` por tarea y prueba manual al final (patrón ya establecido en las features de plan y admin).

---

### Task 1: Esquema Prisma — passwordHash opcional + googleId

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo `User`, líneas ~85-95)

- [ ] **Step 1: Hacer passwordHash opcional y añadir googleId**

En `backend/prisma/schema.prisma`, en el modelo `User`, cambiar la línea:

```prisma
  passwordHash String
```

por:

```prisma
  passwordHash String?
  googleId     String?   @unique
```

(Dejar el resto del modelo igual: `email String @unique`, `name String?`, etc.)

- [ ] **Step 2: Crear la migración**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/backend
npx prisma migrate dev --name add_google_auth
```

Expected: crea `prisma/migrations/<timestamp>_add_google_auth/` y regenera el client sin errores. La migración debe contener `ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL` y `ADD COLUMN "googleId"` + índice único.

- [ ] **Step 3: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0` (el `passwordHash` ahora puede ser `string | null`; si tsc reporta errores en auth.service.ts por esto, se arreglan en la Task 3 — pero al ser solo lectura con `select`, normalmente compila. Si hay error de tipo en `bcrypt.compare(dto.password, user.passwordHash)`, anótalo y se resuelve en Task 3).

- [ ] **Step 4: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(auth): make passwordHash optional and add googleId to User"
```

---

### Task 2: Instalar google-auth-library y configurar GOOGLE_CLIENT_ID

**Files:**
- Modify: `backend/package.json` (dependencias)
- Modify: `backend/.env` (añadir GOOGLE_CLIENT_ID)
- Modify: `backend/.env.example` (documentar la variable)

- [ ] **Step 1: Instalar la dependencia**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/backend
npm install google-auth-library
```

Expected: añade `google-auth-library` a `dependencies` en `package.json`.

- [ ] **Step 2: Añadir la variable de entorno en backend/.env**

Añadir al final de `backend/.env` (el valor real lo provee el usuario desde Google Cloud Console; usar placeholder si aún no lo tiene):

```
# Google OAuth — Client ID de la app web (Google Cloud Console)
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

- [ ] **Step 3: Documentar en backend/.env.example**

Añadir al final de `backend/.env.example`:

```
# Google OAuth — Client ID de la app web (Google Cloud Console → Credentials → OAuth client ID → Web)
GOOGLE_CLIENT_ID=
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add backend/package.json backend/package-lock.json backend/.env.example
git commit -m "chore(auth): add google-auth-library and GOOGLE_CLIENT_ID env"
```

(Nota: `backend/.env` no se commitea si está en `.gitignore` — verificar con `git status`; si lo está, solo se commitea `.env.example`.)

---

### Task 3: DTO + AuthService.googleLogin + manejo de passwordHash null

**Files:**
- Create: `backend/src/modules/auth/dto/google-login.dto.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Crear el DTO**

Crear `backend/src/modules/auth/dto/google-login.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token (credential) devuelto por Google Identity Services',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
```

- [ ] **Step 2: Añadir imports y OAuth2Client en auth.service.ts**

En `backend/src/modules/auth/auth.service.ts`, añadir tras los imports existentes:

```typescript
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
```

Añadir `ConfigService` al constructor (manteniendo los providers actuales):

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly categoriesService: CategoriesService,
    private readonly configService: ConfigService,
  ) {}
```

Y como propiedad de clase (justo antes del constructor o al inicio de la clase), un cliente de Google reutilizable. Para evitar problemas de orden de inicialización, créalo perezosamente con un getter:

```typescript
  private googleClient?: OAuth2Client;

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
      );
    }
    return this.googleClient;
  }
```

- [ ] **Step 3: Implementar googleLogin**

Añadir este método a `AuthService` (por ejemplo, justo después de `login`):

```typescript
  // ─── Login con Google (flujo ID token) ─────────────────────────────────────

  async googleLogin(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    // 1. Verificar el ID token con Google (firma + audience + expiración)
    let payload;
    try {
      const ticket = await this.getGoogleClient().verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name ?? null;

    // 2. Buscar usuario existente por email
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, plan: true, isStaff: true, googleId: true },
    });

    // 3a. Existe → vincular googleId si hace falta y emitir token
    if (existing) {
      if (!existing.googleId) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { googleId },
        });
      }
      return this.buildTokenResponse({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        plan: existing.plan,
        isStaff: existing.isStaff,
      });
    }

    // 3b. No existe → crear usuario solo-Google (sin contraseña)
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        googleId,
        // passwordHash queda null: es un usuario solo-Google
      },
      select: { id: true, email: true, name: true, plan: true, isStaff: true },
    });

    // Sembrar categorías por defecto en background (igual que register)
    void this.categoriesService.seedDefaults(user.id);

    return this.buildTokenResponse(user);
  }
```

- [ ] **Step 4: Manejar passwordHash null en login y changePassword**

En `login`, cambiar la comprobación de contraseña para que no truene si `passwordHash` es null:

```typescript
    const passwordValid =
      user !== null &&
      user.passwordHash !== null &&
      (await bcrypt.compare(dto.password, user.passwordHash));
```

En `changePassword`, tras buscar al usuario, añadir antes del `bcrypt.compare`:

```typescript
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Tu cuenta usa acceso con Google. Aún no tiene contraseña.',
      );
    }
```

- [ ] **Step 5: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0`

- [ ] **Step 6: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add backend/src/modules/auth/dto/google-login.dto.ts backend/src/modules/auth/auth.service.ts
git commit -m "feat(auth): add googleLogin service and handle passwordless accounts"
```

---

### Task 4: Endpoint POST /auth/google

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Importar el DTO**

En `backend/src/modules/auth/auth.controller.ts`, junto a los imports de `LoginDto`/`RegisterDto`:

```typescript
import { GoogleLoginDto } from './dto/google-login.dto';
```

- [ ] **Step 2: Añadir el endpoint**

Añadir tras el método `login` en `AuthController`:

```typescript
  // ─── POST /api/v1/auth/google ─────────────────────────────────────────────

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // mismo límite que login
  @ApiOperation({ summary: 'Iniciar sesión o registrarse con Google (ID token)' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Login con Google exitoso, token JWT emitido' })
  @ApiUnauthorizedResponse({ description: 'Token de Google inválido' })
  google(@Body() dto: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.authService.googleLogin(dto.idToken);
  }
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0`

- [ ] **Step 4: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add backend/src/modules/auth/auth.controller.ts
git commit -m "feat(auth): add POST /auth/google endpoint"
```

---

### Task 5: Frontend — env, tipos y loginWithGoogle en AuthContext

**Files:**
- Modify: `frontend/.env.local` (añadir NEXT_PUBLIC_GOOGLE_CLIENT_ID)
- Modify: `frontend/.env.example` (documentar)
- Modify: `frontend/src/types/auth.types.ts`
- Modify: `frontend/src/context/auth.context.tsx`

- [ ] **Step 1: Añadir la variable de entorno**

Añadir a `frontend/.env.local` (mismo valor que GOOGLE_CLIENT_ID del backend):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

Y a `frontend/.env.example`:

```
# Google OAuth — mismo Client ID que el backend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

- [ ] **Step 2: Añadir loginWithGoogle al tipo del contexto**

En `frontend/src/types/auth.types.ts`, dentro de `AuthContextValue`, añadir tras `register`:

```typescript
  loginWithGoogle: (idToken: string) => Promise<void>;
```

- [ ] **Step 3: Implementar loginWithGoogle en AuthContext**

En `frontend/src/context/auth.context.tsx`, añadir tras el callback `register` (antes de `logout`):

```typescript
  // ── Login con Google ────────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await apiPost<AuthResponse>('/auth/google', { idToken }, { public: true });
    setToken(data.accessToken);
    setSessionCookie(data.accessToken);
    setUser(data.user);
    router.push('/dashboard');
  }, [router]);
```

Y añadirlo al `value` del Provider:

```typescript
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0`

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add frontend/.env.example frontend/src/types/auth.types.ts frontend/src/context/auth.context.tsx
git commit -m "feat(auth): add loginWithGoogle to AuthContext"
```

---

### Task 6: Frontend — componente GoogleSignInButton

**Files:**
- Create: `frontend/src/components/ui/GoogleSignInButton.tsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/ui/GoogleSignInButton.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth.context';

// Tipado mínimo de la API global de Google Identity Services
interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: string; size: string; width: number; text: string; locale: string },
          ) => void;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function GoogleSignInButton({ text = 'continue_with' }: { text?: string }) {
  const { loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CLIENT_ID) {
      setError('Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      return;
    }

    // Carga el script de GIS una sola vez
    function loadScript(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject());
          return;
        }
        const script = document.createElement('script');
        script.src = GSI_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    }

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response: GoogleCredentialResponse) => {
            try {
              await loginWithGoogle(response.credential);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Error al entrar con Google');
            }
          },
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: 320,
          text,
          locale: 'es',
        });
      })
      .catch(() => setError('No se pudo cargar el inicio de sesión con Google'));

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, resolvedTheme, text]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="flex justify-center" />
      {error && <p className="text-xs text-red-500 dark:text-red-400 text-center">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0`

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add frontend/src/components/ui/GoogleSignInButton.tsx
git commit -m "feat(auth): add GoogleSignInButton component"
```

---

### Task 7: Frontend — botón de Google en login y register

**Files:**
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/app/register/page.tsx`

- [ ] **Step 1: Importar el botón en login**

En `frontend/src/app/login/page.tsx`, añadir al bloque de imports:

```typescript
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';
```

- [ ] **Step 2: Renderizar el botón en login**

En `frontend/src/app/login/page.tsx`, el separador actual dice "¿No tienes cuenta?". Insertar el botón de Google ANTES de ese separador, justo después del `</form>` (línea ~104). Reemplazar:

```tsx
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 dark:text-slate-500">
              <span className="bg-white dark:bg-slate-800 px-3">¿No tienes cuenta?</span>
            </div>
          </div>
```

por:

```tsx
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 dark:text-slate-500">
              <span className="bg-white dark:bg-slate-800 px-3">o</span>
            </div>
          </div>

          <GoogleSignInButton text="signin_with" />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 dark:text-slate-500">
              <span className="bg-white dark:bg-slate-800 px-3">¿No tienes cuenta?</span>
            </div>
          </div>
```

- [ ] **Step 3: Importar y renderizar el botón en register**

En `frontend/src/app/register/page.tsx`, añadir el import:

```typescript
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';
```

Luego localizar el cierre del `</form>` del registro y el separador que precede al enlace "¿Ya tienes cuenta?" / "Inicia sesión". Insertar, justo después del `</form>`, el siguiente bloque (un separador "o" + el botón). Buscar la primera ocurrencia de `</form>` en el JSX del formulario de registro y añadir inmediatamente después:

```tsx
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 dark:text-slate-500">
              <span className="bg-white dark:bg-slate-800 px-3">o</span>
            </div>
          </div>

          <GoogleSignInButton text="signup_with" />
```

> Nota para el implementador: lee el JSX completo de `register/page.tsx` antes de editar para insertar el bloque en el lugar correcto (después del `</form>` y respetando el contenedor de la card, las clases `bg-white dark:bg-slate-800` del separador deben coincidir con el fondo real de la card de esa página). Si el fondo de la card difiere, ajusta las clases del `<span>` para que tape la línea correctamente.

- [ ] **Step 4: Verificar compilación**

```bash
cd /Users/sebastiansalgado/Documents/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```

Expected: `exit: 0`

- [ ] **Step 5: Commit**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git add frontend/src/app/login/page.tsx frontend/src/app/register/page.tsx
git commit -m "feat(auth): add Google sign-in button to login and register pages"
```

---

### Task 8: Prueba manual, push y migración en producción

**Files:** ninguno (verificación y despliegue)

- [ ] **Step 1: Prueba local (requiere GOOGLE_CLIENT_ID configurado)**

Con el backend (`npm run start:dev` en `backend/`) y el frontend (`npm run dev` en `frontend/`) corriendo:
1. Ir a `http://localhost:3000/login`. Debe verse el botón de Google.
2. Click → elegir cuenta → debe redirigir a `/dashboard` con sesión iniciada.
3. Repetir en `/register`.
4. Verificar vinculación: con un email que ya exista como cuenta de contraseña, entrar con Google del mismo email → debe entrar a la MISMA cuenta (no crear duplicado). Confirmar en la BD que `googleId` se rellenó.

Expected: login y registro con Google funcionan; la vinculación por email no duplica usuarios.

- [ ] **Step 2: Push a GitHub**

```bash
cd /Users/sebastiansalgado/Documents/finanzas
git push origin main
```

- [ ] **Step 3: Configurar variables de entorno en producción**

- En **Railway** (backend): añadir `GOOGLE_CLIENT_ID` en Variables.
- En **Vercel** (frontend): añadir `NEXT_PUBLIC_GOOGLE_CLIENT_ID` en Environment Variables y redeploy.
- En **Google Cloud Console**: añadir la URL de Vercel a "Authorized JavaScript origins".

- [ ] **Step 4: Aplicar la migración en producción**

En la consola del servicio backend de Railway:

```bash
npx prisma migrate deploy
```

Expected: aplica `add_google_auth` sin errores.

- [ ] **Step 5: Smoke test en producción**

Entrar con Google desde la URL de Vercel y confirmar que el flujo funciona end-to-end.

---

## Self-Review

- **Cobertura del spec:** esquema (T1), dependencia+env (T2), servicio+DTO+null handling (T3), endpoint (T4), env+contexto frontend (T5), componente botón (T6), integración en páginas (T7), prueba+deploy (T8). ✅
- **Vinculación Opción A:** cubierta en T3 step 3 (existing → link, else → create). ✅
- **passwordHash null:** login y changePassword manejados en T3 step 4. ✅
- **Consistencia de tipos:** `loginWithGoogle: (idToken: string) => Promise<void>` definido en T5 (tipo y contexto) y consumido en T6. `POST /auth/google` con body `{ idToken }` consistente entre T4 (controller/DTO) y T5 (apiPost). ✅
- **Prerrequisito manual:** Google Cloud Console Client ID documentado en spec y en T2/T8. ✅
