# Admin Panel — Diseño

## Goal

Panel de administración en `/admin` que permite gestionar usuarios, activar acceso completo (staff), cambiar planes manualmente, ver ingresos reales vs. planes regalados, y consultar el historial de cambios de plan.

## Arquitectura

### Nuevos campos en `User`

```prisma
isStaff            Boolean   @default(false)
planGrantedByAdmin Boolean   @default(false)
```

- `isStaff`: bypasea todos los límites del plan y da acceso al panel de admin.
- `planGrantedByAdmin`: distingue planes pagados (false) de planes asignados por admin (true). Se usa para calcular MRR real.

### Nuevo modelo `PlanHistory`

```prisma
model PlanHistory {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  fromPlan    PlanType
  toPlan      PlanType
  changedById String?
  changedBy   User?     @relation("AdminChanges", fields: [changedById], references: [id], onDelete: SetNull)
  grantedByAdmin Boolean @default(false)
  note        String?
  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

El campo `changedById` es null cuando el cambio lo hace el sistema (pago procesado). `grantedByAdmin` facilita las queries de estadísticas sin hacer joins.

### JWT payload

Se añade `isStaff: boolean` al payload del JWT para que el frontend pueda proteger la ruta `/admin` sin llamadas extra al backend.

---

## Backend

### Migración Prisma

Una migración: `add_admin_fields_and_plan_history`

### PlanService — bypass para staff

Todos los métodos `assertCan*` y `assertBusinessAccess` / `assertWriteAccess` reciben el `User` completo (o al menos `isStaff`). Si `isStaff === true`, retornan inmediatamente sin verificar límites.

El `getUsage` devuelve los datos reales igualmente (para que el UsageCard del dashboard sea informativo), pero los `assert*` no bloquean.

### AdminGuard

Guard de NestJS que verifica `request.user.isStaff === true`. Lanza `ForbiddenException('ADMIN_ONLY')` si no.

### AdminModule (`backend/src/modules/admin/`)

**Archivos:**
- `admin.service.ts`
- `admin.controller.ts`
- `admin.module.ts`
- `dto/change-plan.dto.ts`
- `dto/toggle-staff.dto.ts`
- `dto/change-plan-note.dto.ts`

**Endpoints (todos requieren AdminGuard):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/stats` | Estadísticas globales |
| GET | `/admin/users` | Lista todos los usuarios |
| PATCH | `/admin/users/:id/plan` | Cambia plan de un usuario |
| PATCH | `/admin/users/:id/staff` | Activa/desactiva staff |
| GET | `/admin/users/:id/history` | Historial de plan de un usuario |
| GET | `/admin/history` | Historial global paginado |

**GET `/admin/stats` — respuesta:**

```typescript
{
  totalUsers: number,
  byPlan: {
    FREE: number,
    PRO: number,
    EMPRESA: number,
  },
  paidPlans: {          // planGrantedByAdmin === false
    PRO: number,
    EMPRESA: number,
  },
  grantedPlans: {       // planGrantedByAdmin === true
    PRO: number,
    EMPRESA: number,
  },
  mrr: number,          // paidPlans.PRO * 16900 + paidPlans.EMPRESA * 34900 (COP)
  mrrLost: number,      // grantedPlans.PRO * 16900 + grantedPlans.EMPRESA * 34900
  newUsersLast30Days: number,
}
```

**GET `/admin/users` — respuesta:**

Array de usuarios con: `id, email, name, plan, isStaff, planGrantedByAdmin, createdAt, _count.businesses`.

**PATCH `/admin/users/:id/plan`:**

Body: `{ plan: PlanType, note?: string }`

- Actualiza `user.plan`, `user.planGrantedByAdmin = true`, `user.planStartedAt = now()`
- Crea entrada en `PlanHistory` con `grantedByAdmin: true`, `changedById: adminId`, `note`
- Si el plan es FREE, también pone `planGrantedByAdmin = false`

**PATCH `/admin/users/:id/staff`:**

Body: `{ isStaff: boolean }`

- Actualiza `user.isStaff`
- Si `isStaff === true` y el plan es FREE, automáticamente sube el plan a EMPRESA y crea entrada en `PlanHistory` con nota "Activado por admin"
- Si `isStaff === false` y el plan fue `grantedByAdmin`, baja el plan a FREE y crea entrada en `PlanHistory`

**GET `/admin/history`:**

Query params: `page` (default 1), `limit` (default 50), `userId?`

Retorna historial paginado con info del usuario y del admin que hizo el cambio.

---

## Frontend

### Ruta `/admin`

Archivo: `frontend/src/app/(dashboard)/admin/page.tsx`

Protección: si `user.isStaff !== true`, redirige a `/personal`.

### Secciones del panel

**1. Cards de estadísticas (fila superior)**

| Card | Valor |
|------|-------|
| Total usuarios | `stats.totalUsers` |
| MRR real | `$stats.mrr` formateado en COP |
| Planes regalados | `stats.grantedPlans.PRO + stats.grantedPlans.EMPRESA` usuarios · `$stats.mrrLost` COP "no cobrados" |
| Nuevos este mes | `stats.newUsersLast30Days` |

**2. Tabla de usuarios**

Columnas: Nombre/Email · Plan (badge de color) · Staff (toggle) · Empresas · Registro · Acciones

Acciones por fila:
- Cambiar plan: selector FREE / PRO / EMPRESA + campo de nota opcional
- Ver historial del usuario (expande debajo de la fila o modal)

**3. Historial global (tab o sección inferior)**

Tabla: Fecha · Usuario · Cambio (FREE → PRO) · Por quién · Nota

Filtro por usuario con búsqueda de email.

### Acceso desde el menú

En `UserMenu.tsx`, si `user.isStaff === true`, aparece una opción "Admin" en el menú desplegable (con ícono de escudo o llave). No visible para usuarios normales.

---

## Activación inicial (bootstrap)

El primer admin (tú) se activa una sola vez con SQL directo en la consola de Railway/Supabase:

```sql
UPDATE "User" SET "isStaff" = true, plan = 'EMPRESA', "planStartedAt" = NOW()
WHERE email = 'tu@email.com';
```

Después de eso, puedes gestionar todo desde el panel sin tocar la BD.

---

## Precios de referencia (para cálculo de MRR)

- Nomi PRO: $16.900 COP/mes
- Nomi Empresa: $34.900 COP/mes

Estas constantes viven en el `AdminService`, no en el frontend.
