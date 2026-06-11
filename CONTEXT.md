# MaIA Finanzas — Contexto del Proyecto

## Descripción

Aplicación fullstack de finanzas personales y empresariales con IA. Permite gestionar transacciones, cuentas bancarias, importar movimientos desde correo electrónico (Bancolombia/Nequi), escanear facturas DIAN via QR, importar Excel y gestionar módulo empresarial completo (facturas, cotizaciones, proveedores, clientes, productos).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js 14 App Router + Tailwind CSS |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT (localStorage, clave `finanzas_token`) |
| Email IMAP | imapflow |
| Encriptación | AES-256-GCM (Node crypto) |
| Deploy backend | Railway (`superb-energy`) |
| Deploy frontend | Vercel (`finanzas-mauve-nine.vercel.app`) |

---

## Estructura del repositorio

```
finanzas/
├── backend/                        # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── common/
│       │   ├── encryption/         # AES-256-GCM EncryptionService
│       │   └── prisma/             # PrismaService
│       ├── modules/
│       │   ├── auth/               # JWT login/register
│       │   ├── bank-accounts/      # Cuentas bancarias
│       │   ├── categories/         # Categorías de transacciones
│       │   ├── transactions/       # Transacciones personales
│       │   ├── webhooks/           # SMS webhooks (Nequi/Bancolombia)
│       │   ├── email-ingestion/    # Cron IMAP — ingesta automática de emails
│       │   ├── email-config/       # CRUD credenciales IMAP por usuario
│       │   ├── businesses/         # Módulo empresarial
│       │   ├── customers/
│       │   ├── invoices/
│       │   ├── products/
│       │   ├── price-lists/
│       │   ├── quotes/
│       │   ├── suppliers/
│       │   ├── purchases/
│       │   └── reports/
│       ├── app.module.ts
│       └── main.ts                 # CORS dinámico (producción + previews Vercel)
└── frontend/                       # Next.js 14
    └── src/
        ├── app/
        │   ├── (dashboard)/
        │   │   ├── personal/       # Módulo finanzas personales
        │   │   ├── empresas/       # Módulo empresarial
        │   │   └── configuracion/  # Integración de correo IMAP
        │   ├── login/
        │   └── register/
        ├── components/
        │   ├── accounts/
        │   ├── transactions/
        │   ├── settings/           # EmailConfigCard
        │   ├── excel/              # ExcelImportWizard
        │   └── ui/                 # Button, Input, Modal, Toast, UserMenu...
        └── lib/
            └── api.ts              # Cliente HTTP centralizado con JWT
```

---

## Producción

| Servicio | URL / Referencia |
|---------|-----------------|
| Frontend | `https://finanzas-mauve-nine.vercel.app` |
| Backend API | `https://superb-energy-production-59be.up.railway.app` |
| DB pública | `acela.proxy.rlwy.net:27706` |
| DB interna | `postgres.railway.internal:5432` |

---

## Variables de entorno

### Railway (backend `superb-energy`)
```
DATABASE_URL        → postgresql://...@postgres.railway.internal:5432/railway
FRONTEND_URL        → https://finanzas-mauve-nine.vercel.app
JWT_SECRET          → (secret)
JWT_EXPIRES_IN      → 7d
PORT                → (auto Railway)
NODE_ENV            → production
WEBHOOK_SECRET      → (secret)
ENCRYPTION_KEY      → (32+ chars — para AES-256-GCM de contraseñas IMAP)
```

### Vercel (frontend)
```
NEXT_PUBLIC_API_URL → https://superb-energy-production-59be.up.railway.app
INTERNAL_API_URL    → https://superb-energy-production-59be.up.railway.app
```

---

## Módulos clave

### Email Ingestion (cron cada 30s)
- Lee `email_integrations` de la BD (credenciales IMAP por usuario)
- Desencripta contraseña con `EncryptionService`
- Busca emails no leídos de los últimos 7 días
- Filtra por dominio bancario (Bancolombia/Nequi)
- Extrae texto de emails HTML-only con `stripHtml()`
- Si no existe cuenta bancaria para el usuario → **la crea automáticamente**
- Crea transacción y la vincula al usuario

### Email Config (`/configuracion`)
- `POST /api/v1/email-config` — guarda credenciales IMAP encriptadas
- `GET /api/v1/email-config` — devuelve config sin contraseña
- `DELETE /api/v1/email-config` — elimina integración

### DIAN QR Scanner
- `POST /api/v1/transactions/scan-dian` — recibe URL QR, consulta catálogo DIAN, extrae items
- Frontend: `QrScanner` + `DianConfirmModal`

### CORS (main.ts)
```typescript
// Soporta producción + previews dinámicas de Vercel
const vercelPreviewRegex = /^https:\/\/finanzas-.*-nomi-s-projects4\.vercel\.app$/;
```

---

## Modelos Prisma principales

```prisma
User              — id, email, passwordHash, name
BankAccount       — id, userId, name, type, balance, provider, externalAccountId
Transaction       — id, userId, bankAccountId, categoryId, amount, type, date
Category          — id, userId, name
EmailIntegration  — id, userId, emailUser, emailPassword (encriptado), emailHost, emailPort, emailMailbox
Business          — id, userId, name, nit, ...
```

---

## Convenciones

- Todos los endpoints bajo `/api/v1/`
- JWT en `localStorage` con clave `finanzas_token` — helper `getToken()` en `api.ts`
- `next.config.mjs` sin `output: 'standalone'` (incompatible con Vercel)
- imapflow: siempre `{ uid: true }` en search/fetchOne/messageFlagsAdd
- Commits en español con prefijo convencional (`feat/fix/chore`)
- Push directo a `main` — Railway y Vercel redesplegan automáticamente
