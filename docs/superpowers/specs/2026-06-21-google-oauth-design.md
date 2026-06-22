# Login con Google — Diseño

## Goal

Permitir que los usuarios accedan a Nomi con su cuenta de Google, además del email/contraseña actual. Si el email de Google ya existe como cuenta, se vinculan automáticamente (no se duplica el usuario).

## Enfoque elegido

**Google Identity Services (GIS) — flujo de ID token.** El frontend renderiza el botón oficial "Iniciar sesión con Google". Al autenticarse, Google devuelve un **ID token** (un JWT firmado por Google) directamente al navegador. El frontend lo envía al backend (`POST /auth/google`), que lo verifica con `google-auth-library` y emite el JWT propio de Nomi.

Ventajas frente al flujo OAuth con redirect:
- No hay que registrar/gestionar redirect URIs ni rutas de callback.
- No se maneja `client_secret` en el backend (solo se verifica la firma del token con el `client_id`).
- Es el método recomendado por Google para SPAs/apps web.

## Vinculación de cuentas (Opción A)

Cuando llega un ID token verificado con `email` + `sub` (id de Google):

1. **Existe usuario con ese email** → se vincula: si `googleId` está vacío se rellena con el `sub`, y se emite token. (Cubre el caso de quien se registró con contraseña y luego entra con Google.)
2. **No existe** → se crea un usuario nuevo con `email`, `name`, `googleId = sub`, **sin contraseña**, y se siembran sus categorías por defecto (igual que el registro normal). Se emite token.

El email de Google se considera verificado por Google, así que la vinculación por email es segura.

## Cambios de esquema (`User`)

```prisma
passwordHash String?            // antes obligatorio → ahora opcional (usuarios solo-Google no tienen)
googleId     String?  @unique   // "sub" del ID token de Google; null para usuarios solo-contraseña
```

Migración: `add_google_auth`

### Impacto en métodos existentes

- **`login` (email/contraseña):** si el usuario no tiene `passwordHash` (cuenta solo-Google), `bcrypt.compare` no se ejecuta y se devuelve "Credenciales incorrectas" (mensaje genérico, no revela el motivo).
- **`changePassword`:** si `passwordHash` es null, lanza error claro pidiendo que primero establezca una contraseña (fuera de alcance ahora) — por ahora `BadRequestException` con mensaje explicativo.

## Backend

### Dependencia
`google-auth-library` (verifica el ID token con `OAuth2Client.verifyIdToken`).

### Variable de entorno
`GOOGLE_CLIENT_ID` — el Client ID de la app web creada en Google Cloud Console. El mismo valor se usa en el frontend como `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### Endpoint nuevo

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/auth/google` | `{ idToken: string }` | Verifica el ID token, vincula/crea usuario, devuelve `{ accessToken, user }` |

Misma forma de respuesta que `/auth/login` y `/auth/register` (`AuthResponseDto`). Throttle igual que login (5/min por IP).

### `AuthService.googleLogin(idToken)`

1. `verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })` → payload.
2. Si falla la verificación → `UnauthorizedException('Token de Google inválido')`.
3. Extrae `sub`, `email`, `name`.
4. Busca por email; vincula o crea según la lógica de la Opción A.
5. `buildTokenResponse(user)`.

## Frontend

### Variable de entorno
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### Componente `GoogleSignInButton`
- Carga el script de Google Identity Services (`https://accounts.google.com/gsi/client`) una sola vez.
- Inicializa `google.accounts.id` con el `client_id` y un callback.
- Renderiza el botón oficial de Google.
- En el callback recibe `response.credential` (el ID token) y llama a `loginWithGoogle(credential)`.

### `AuthContext.loginWithGoogle(idToken)`
Igual que `login`, pero contra `POST /auth/google`: guarda token + cookie, setea user, redirige a `/dashboard`.

### Ubicación del botón
En **login** y en **register**, debajo del formulario, con un separador "o".

## Setup manual previo (lo hace el usuario)

En [Google Cloud Console](https://console.cloud.google.com/):
1. Crear proyecto (o usar uno existente).
2. APIs & Services → Credentials → Create Credentials → OAuth client ID → tipo **Web application**.
3. En "Authorized JavaScript origins" añadir: `http://localhost:3000` (dev) y la URL de Vercel (prod).
4. Copiar el **Client ID** → pegarlo en `GOOGLE_CLIENT_ID` (backend) y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend).
5. Configurar la "OAuth consent screen" (External, datos básicos de la app).

## Verificación

Este codebase verifica features con `npx tsc --noEmit` (compilación) + prueba manual, no con tests unitarios. Se sigue ese patrón: cada tarea compila limpio y al final se prueba el flujo real en el navegador.

## Fuera de alcance (YAGNI)
- "Establecer contraseña" para usuarios solo-Google (se puede añadir después).
- One Tap / auto-select de Google.
- Login con otros proveedores (Apple, Facebook).
