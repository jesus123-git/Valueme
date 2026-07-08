# Punto de venta ("Vender" / POS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla de punto de venta en `/empresas/[id]/vender` para registrar ventas: seleccionar productos, cobrar (venta rápida o factura), descontar inventario y emitir recibo.

**Architecture:** Backend: modelos `Sale`/`SaleItem` + enum `PaymentMethod` + módulo `Sales` (`POST/GET /businesses/:id/sales`) que crea la venta, descuenta stock y registra un `bizTransaction` INCOME. La opción "factura" reutiliza el módulo de facturas existente. Frontend: una pantalla POS (grid de productos + carrito + cobro + recibo).

**Tech Stack:** NestJS + Prisma + PostgreSQL, Next.js 14 App Router, TanStack Query, axios, Tailwind, lucide-react.

**Ruta del proyecto:** `/Users/sebastiansalgado/finanzas`. `tsc` de backend corre en `backend/`, el de frontend en `frontend/`.

**Commits:** mensajes PLANOS, SIN ninguna línea `Co-Authored-By` ni atribución a Claude/IA.

**Verificación:** `npx tsc --noEmit` por tarea + prueba manual. Sin tests unitarios.

---

### Task 1: Esquema Prisma — PaymentMethod + Sale + SaleItem

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Añadir el enum**

Junto a los otros enums en `backend/prisma/schema.prisma` (p. ej. tras `enum ProductType { ... }`):
```prisma
enum PaymentMethod {
  CASH
  CARD
  TRANSFER
}
```

- [ ] **Step 2: Añadir los modelos**

Añadir cerca de los otros modelos empresariales (p. ej. después de `model InvoiceItem`):
```prisma
model Sale {
  id             String        @id @default(uuid())
  businessId     String
  customerId     String?
  number         String
  subtotal       Float
  tax            Float         @default(0)
  total          Float
  paymentMethod  PaymentMethod @default(CASH)
  amountReceived Float?
  createdAt      DateTime      @default(now())

  business       Business   @relation(fields: [businessId], references: [id], onDelete: Cascade)
  customer       Customer?  @relation(fields: [customerId], references: [id])
  items          SaleItem[]

  @@index([businessId, createdAt])
  @@map("sales")
}

model SaleItem {
  id          String   @id @default(uuid())
  saleId      String
  productId   String?
  description String
  quantity    Float
  unitPrice   Float
  taxRate     Float    @default(0)
  total       Float

  sale        Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product     Product? @relation(fields: [productId], references: [id])

  @@map("sale_items")
}
```

- [ ] **Step 3: Añadir relaciones inversas**

- En `model Business`, en la lista de relaciones (junto a `invoices Invoice[]` etc.), añadir: `sales Sale[]`
- En `model Customer`, junto a `invoices Invoice[]`: `sales Sale[]`
- En `model Product`, junto a `invoiceItems InvoiceItem[]`: `saleItems SaleItem[]`

- [ ] **Step 4: Generar la migración (entorno no interactivo)**

`prisma migrate dev` requiere TTY y no funciona aquí. Escribir la migración a mano (es la vía fiable en este entorno) y regenerar el client:
```bash
cd /Users/sebastiansalgado/finanzas/backend
TS=$(date +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_add_sales_pos
cat > prisma/migrations/${TS}_add_sales_pos/migration.sql <<'SQL'
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "number" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amountReceived" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_businessId_createdAt_idx" ON "sales"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
SQL
echo "--- migration.sql ---"; cat prisma/migrations/${TS}_add_sales_pos/migration.sql
npx prisma generate 2>&1; echo "generate-exit: $?"
```
Expected: `prisma generate` exit 0 y el client reconoce `sale`/`saleItem`.

- [ ] **Step 5: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`.

- [ ] **Step 6: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(pos): add PaymentMethod enum and Sale/SaleItem models"
```

---

### Task 2: Backend — módulo Sales

**Files:**
- Create: `backend/src/modules/sales/dto/create-sale.dto.ts`
- Create: `backend/src/modules/sales/sales.service.ts`
- Create: `backend/src/modules/sales/sales.controller.ts`
- Create: `backend/src/modules/sales/sales.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: DTO**

`backend/src/modules/sales/dto/create-sale.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

class SaleItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(0) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiProperty() @IsNumber() @Min(0) taxRate: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amountReceived?: number;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
```

- [ ] **Step 2: Service**

`backend/src/modules/sales/sales.service.ts`:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { PlanService } from '../plan/plan.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private planService: PlanService,
  ) {}

  private async generateSaleNumber(businessId: string): Promise<string> {
    const count = await this.prisma.sale.count({ where: { businessId } });
    return `SALE-${String(count + 1).padStart(4, '0')}`;
  }

  async create(userId: string, businessId: string, dto: CreateSaleDto) {
    await this.planService.assertWriteAccess(userId, businessId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un ítem');
    }

    let subtotal = 0;
    let totalTax = 0;
    const items = dto.items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      totalTax += itemTax;
      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: itemSubtotal + itemTax,
      };
    });
    const total = subtotal + totalTax;
    const number = await this.generateSaleNumber(businessId);

    const sale = await this.prisma.sale.create({
      data: {
        businessId,
        customerId: dto.customerId ?? null,
        number,
        subtotal,
        tax: totalTax,
        total,
        paymentMethod: dto.paymentMethod,
        amountReceived: dto.amountReceived ?? null,
        items: { create: items },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });

    // Descontar inventario (solo productos con trackInventory; permite negativo)
    await Promise.all(
      dto.items
        .filter(i => i.productId)
        .map(i => this.productsService.adjustStock(i.productId!, i.quantity, 'subtract')),
    );

    // Registrar el ingreso para KPIs / reportes
    await this.prisma.bizTransaction.create({
      data: {
        businessId,
        type: 'INCOME',
        amount: total,
        description: `Venta ${number}`,
        categoryLabel: 'Venta POS',
        date: new Date(),
      },
    });

    // Avisos de stock bajo (no bloquean)
    const warnings: string[] = [];
    for (const i of dto.items) {
      if (!i.productId) continue;
      const p = await this.prisma.product.findUnique({ where: { id: i.productId } });
      if (p && p.trackInventory && p.stock < 0) {
        warnings.push(`Stock negativo en "${p.name}" (${p.stock})`);
      }
    }

    return { sale, warnings };
  }

  async findAll(userId: string, businessId: string) {
    await this.planService.assertBusinessAccess(userId, businessId);
    return this.prisma.sale.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });
  }
}
```

- [ ] **Step 3: Controller**

`backend/src/modules/sales/sales.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una venta rápida (POS)' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(user.id, businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de ventas de la empresa' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.salesService.findAll(user.id, businessId);
  }
}
```

- [ ] **Step 4: Module**

`backend/src/modules/sales/sales.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [ProductsModule, PlanModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
```

- [ ] **Step 5: Registrar en AppModule**

En `backend/src/app.module.ts`, importar `SalesModule` y añadirlo al array `imports`:
```typescript
import { SalesModule } from './modules/sales/sales.module';
```

- [ ] **Step 6: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`. (Si `PlanModule` no exporta `PlanService`, revisar cómo lo importan otros módulos como `products.module.ts` — ya se comprobó que `ProductsModule` importa `PlanModule`, así que el patrón funciona.)

- [ ] **Step 7: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add backend/src/modules/sales backend/src/app.module.ts
git commit -m "feat(pos): add Sales module with quick-sale endpoint"
```

---

### Task 3: Frontend — pantalla POS completa

**Files:**
- Overwrite: `frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx` (reemplaza el stub)

- [ ] **Step 1: Escribir la pantalla POS**

Reemplazar TODO el contenido de `frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx`:
```tsx
'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, X, AlertTriangle, Printer, ShoppingCart } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; price: number; taxRate: number; unit: string;
  type: 'PRODUCT' | 'SERVICE'; trackInventory: boolean; stock: number; isActive: boolean; sku?: string;
}
interface Customer { id: string; name: string }
interface Business { id: string; name: string; currency?: string }
interface CartLine {
  productId?: string; description: string; unitPrice: number; taxRate: number;
  quantity: number; trackInventory: boolean; stock: number;
}
type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
type Mode = 'QUICK' | 'INVOICE';

interface Receipt {
  number: string; items: CartLine[]; subtotal: number; tax: number; total: number;
  paymentMethod: PaymentMethod; amountReceived?: number; change?: number;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
};

export default function VenderPage() {
  const { id } = useParams<{ id: string }>();

  const { data: business } = useQuery<Business>({
    queryKey: ['business', id],
    queryFn: async () => (await api.get(`/businesses/${id}`)).data,
    enabled: !!id,
  });
  const currency = business?.currency ?? 'COP';

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', id],
    queryFn: async () => (await api.get(`/businesses/${id}/products`)).data,
    enabled: !!id,
  });
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers', id],
    queryFn: async () => (await api.get(`/businesses/${id}/customers`)).data,
    enabled: !!id,
  });

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('QUICK');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const activeProducts = useMemo(
    () => (products ?? []).filter(p => p.isActive),
    [products],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter(p =>
      p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q),
    );
  }, [activeProducts, search]);

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    for (const l of cart) {
      const s = l.quantity * l.unitPrice;
      subtotal += s;
      tax += s * (l.taxRate / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  function addProduct(p: Product) {
    setCart(prev => {
      const idx = prev.findIndex(l => l.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, {
        productId: p.id, description: p.name, unitPrice: p.price, taxRate: p.taxRate,
        quantity: 1, trackInventory: p.trackInventory, stock: p.stock,
      }];
    });
  }
  function setQty(i: number, qty: number) {
    setCart(prev => {
      if (qty <= 0) return prev.filter((_, idx) => idx !== i);
      const next = [...prev];
      next[i] = { ...next[i], quantity: qty };
      return next;
    });
  }
  function removeLine(i: number) { setCart(prev => prev.filter((_, idx) => idx !== i)); }

  const changeDue = paymentMethod === 'CASH' && amountReceived
    ? Number(amountReceived) - totals.total : 0;
  const canConfirm = cart.length > 0 && !submitting &&
    !(paymentMethod === 'CASH' && amountReceived !== '' && Number(amountReceived) < totals.total);

  async function confirm() {
    setSubmitting(true); setError('');
    try {
      const itemsPayload = cart.map(l => ({
        productId: l.productId, description: l.description,
        quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate,
      }));
      let number: string;
      if (mode === 'QUICK') {
        const res = await api.post(`/businesses/${id}/sales`, {
          customerId: customerId || undefined,
          paymentMethod,
          amountReceived: paymentMethod === 'CASH' && amountReceived ? Number(amountReceived) : undefined,
          items: itemsPayload,
        });
        number = res.data.sale.number;
      } else {
        const inv = await api.post(`/businesses/${id}/invoices`, {
          customerId: customerId || undefined,
          notes: `Pagado con ${PAYMENT_LABELS[paymentMethod]}`,
          items: itemsPayload,
        });
        await api.patch(`/businesses/${id}/invoices/${inv.data.id}/status`, { status: 'PAID' });
        number = inv.data.number;
      }
      setReceipt({
        number, items: cart, subtotal: totals.subtotal, tax: totals.tax, total: totals.total,
        paymentMethod,
        amountReceived: paymentMethod === 'CASH' && amountReceived ? Number(amountReceived) : undefined,
        change: paymentMethod === 'CASH' && amountReceived ? Number(amountReceived) - totals.total : undefined,
      });
      setCheckoutOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  }

  function newSale() {
    setCart([]); setReceipt(null); setAmountReceived(''); setCustomerId(''); setMode('QUICK'); setPaymentMethod('CASH'); setError('');
  }

  // ─── Recibo ───────────────────────────────────────────────────────────────
  if (receipt) {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 print:border-0">
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{business?.name ?? 'Empresa'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recibo {receipt.number}</p>
            <p className="text-xs text-slate-400">{new Date().toLocaleString('es-CO')}</p>
          </div>
          <div className="border-t border-dashed border-slate-200 dark:border-slate-700 py-3 space-y-1.5">
            {receipt.items.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{l.quantity} × {l.description}</span>
                <span className="text-slate-800 dark:text-slate-100">{formatCurrency(l.quantity * l.unitPrice, currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal, currency)}</span></div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>IVA</span><span>{formatCurrency(receipt.tax, currency)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-white text-base"><span>Total</span><span>{formatCurrency(receipt.total, currency)}</span></div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1"><span>Pago</span><span>{PAYMENT_LABELS[receipt.paymentMethod]}</span></div>
            {receipt.change !== undefined && (
              <>
                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Recibido</span><span>{formatCurrency(receipt.amountReceived ?? 0, currency)}</span></div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Cambio</span><span>{formatCurrency(receipt.change, currency)}</span></div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4 print:hidden">
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Printer size={16} /> Imprimir
          </button>
          <button onClick={newSale} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  // ─── POS ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre o SKU…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-400 hover:shadow-sm transition"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2">{p.name}</p>
                <p className="text-sm text-violet-600 dark:text-violet-400 font-bold mt-1">{formatCurrency(p.price, currency)}</p>
                {p.trackInventory && (
                  <p className={`text-xs mt-0.5 ${p.stock <= 0 ? 'text-red-500' : 'text-slate-400'}`}>Stock: {p.stock}</p>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-sm text-slate-400 py-10">No hay productos.</p>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:sticky lg:top-20">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={18} className="text-violet-600 dark:text-violet-400" />
              <h2 className="font-bold text-slate-800 dark:text-white">Carrito</h2>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Toca un producto para agregarlo.</p>
            ) : (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {cart.map((l, i) => {
                  const overStock = l.trackInventory && l.quantity > l.stock;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{l.description}</p>
                        <p className="text-xs text-slate-400">{formatCurrency(l.unitPrice, currency)} c/u</p>
                        {overStock && (
                          <p className="text-xs text-amber-500 flex items-center gap-1 mt-0.5"><AlertTriangle size={11} /> Supera el stock ({l.stock})</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(i, l.quantity - 1)} className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500"><Minus size={13} /></button>
                        <span className="w-7 text-center text-sm text-slate-800 dark:text-white">{l.quantity}</span>
                        <button onClick={() => setQty(i, l.quantity + 1)} className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500"><Plus size={13} /></button>
                        <button onClick={() => removeLine(i)} className="p-1 rounded-md text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>IVA</span><span>{formatCurrency(totals.tax, currency)}</span></div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-white text-base"><span>Total</span><span>{formatCurrency(totals.total, currency)}</span></div>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full mt-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              Cobrar {formatCurrency(totals.total, currency)}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de cobro */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-white">Cobrar {formatCurrency(totals.total, currency)}</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Modo */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {([['QUICK', 'Venta rápida'], ['INVOICE', 'Generar factura']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${mode === m ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Método de pago</label>
                <div className="flex gap-2">
                  {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map(pm => (
                    <button key={pm} onClick={() => setPaymentMethod(pm)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${paymentMethod === pm ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {PAYMENT_LABELS[pm]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Efectivo: monto recibido + cambio */}
              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Monto recibido</label>
                  <input
                    type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  {amountReceived !== '' && (
                    <p className={`text-sm mt-1.5 font-medium ${changeDue < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {changeDue < 0 ? 'Falta ' + formatCurrency(-changeDue, currency) : 'Cambio: ' + formatCurrency(changeDue, currency)}
                    </p>
                  )}
                </div>
              )}
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Cliente (opcional)</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
                  <option value="">Cliente ocasional</option>
                  {(customers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

              <button onClick={confirm} disabled={!canConfirm}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold">
                {submitting ? 'Procesando…' : mode === 'QUICK' ? 'Confirmar venta' : 'Generar factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "exit: $?"
```
Expected: `exit: 0`. Si `formatCurrency` no acepta `(value, currency)`, revisar su firma en `frontend/src/lib/utils.ts` y ajustar las llamadas (el dashboard de empresa ya la usa así, debería coincidir).

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastiansalgado/finanzas
git add "frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx"
git commit -m "feat(pos): add point-of-sale screen with cart, checkout and receipt"
```

---

### Task 4: Verificación final, push y migración en producción

**Files:** ninguno.

- [ ] **Step 1: Compilación de ambos proyectos**

```bash
cd /Users/sebastiansalgado/finanzas/backend && npx tsc --noEmit 2>&1; echo "backend: $?"
cd /Users/sebastiansalgado/finanzas/frontend && npx tsc --noEmit 2>&1; echo "frontend: $?"
```
Expected: ambos `0`.

- [ ] **Step 2: Prueba manual (dev)**

Backend (`npm run start:dev`) + frontend (`npm run dev`), con la migración aplicada localmente (`npx prisma migrate deploy` en `backend/`):
1. Entrar a un negocio → sidebar → "Vender".
2. Buscar y tocar productos → se agregan al carrito; ajustar cantidades.
3. Producto con inventario y cantidad > stock → muestra aviso (no bloquea).
4. "Cobrar" → modo "Venta rápida", Efectivo, monto recibido → ver cambio → Confirmar → recibo con SALE-XXXX. Verificar en Productos que el stock bajó y en el dashboard/reportes que el ingreso aparece.
5. Repetir con "Generar factura" → aparece en Facturas como PAID.
6. "Imprimir" abre el diálogo; "Nueva venta" limpia el carrito.

- [ ] **Step 3: Push**

```bash
cd /Users/sebastiansalgado/finanzas
git push origin main
```

- [ ] **Step 4: Migración en producción**

En la consola del backend en Railway:
```bash
npx prisma migrate deploy
```
Expected: aplica `add_sales_pos` (y cualquier migración pendiente previa) sin errores.

---

## Self-Review

- **Cobertura del spec:** modelos + enum + migración (Task 1); módulo Sales con venta rápida (bizTransaction + stock + warnings) e historial (Task 2); pantalla POS con grid, carrito, aviso de stock, cobro en ambos modos, cálculo de cambio, cliente opcional y recibo (Task 3); verificación + deploy (Task 4). ✅
- **Opción factura:** en Task 3, `mode === 'INVOICE'` reutiliza `POST /invoices` + `PATCH /invoices/:id/status` (PAID) con el método de pago en `notes`. No crea Sale ni bizTransaction (sin doble conteo). ✅
- **Consistencia de tipos:** `PaymentMethod` = `'CASH'|'CARD'|'TRANSFER'` en backend (enum Prisma) y frontend (type). El endpoint `POST /businesses/:id/sales` devuelve `{ sale, warnings }`; el frontend lee `res.data.sale.number`. ✅
- **Sin backend duplicado:** la venta rápida usa `productsService.adjustStock` y crea `bizTransaction` (mismos patrones que invoices). ✅
- **Sin placeholders; commits sin atribución.** ✅
