# Punto de venta ("Vender" / POS) — Diseño

## Goal

Dar al módulo de empresas una pantalla de punto de venta en `/empresas/[id]/vender` (hoy un stub "Próximamente") para registrar ventas al instante: seleccionar productos, cobrar, descontar inventario y emitir un recibo. Al cobrar, el usuario elige entre **venta rápida** (registro ligero) o **generar una factura formal**.

## Alcance

Una sola feature (POS). Backend: modelos + módulo de ventas. Frontend: una pantalla + recibo. Sin integración DIAN ni pasarelas de pago reales (YAGNI). Reutiliza el sistema de facturas existente para la opción "generar factura".

## Modelo de datos (backend)

### Enum nuevo
```prisma
enum PaymentMethod {
  CASH
  CARD
  TRANSFER
}
```

### Modelos nuevos
```prisma
model Sale {
  id             String        @id @default(uuid())
  businessId     String
  customerId     String?
  number         String        // SALE-0001, SALE-0002...
  subtotal       Float
  tax            Float         @default(0)
  total          Float
  paymentMethod  PaymentMethod @default(CASH)
  amountReceived Float?        // solo efectivo (para calcular el cambio)
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

Se añaden las relaciones inversas en `Business` (`sales Sale[]`), `Customer` (`sales Sale[]`) y `Product` (`saleItems SaleItem[]`).

Migración: `add_sales_pos`.

## Backend — módulo `Sales`

Archivos en `backend/src/modules/sales/`: `sales.module.ts`, `sales.service.ts`, `sales.controller.ts`, `dto/create-sale.dto.ts`.

Registrado en `AppModule`. El módulo importa `PrismaService`, `ProductsService` (para `adjustStock`), y el módulo/servicio de plan si se requiere el guard de acceso a empresa (seguir el patrón de otros controllers de empresa, p. ej. `assertBusinessAccess`).

### Endpoints (bajo el prefijo de empresa, con `JwtAuthGuard`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/businesses/:id/sales` | Registrar una venta rápida |
| GET | `/businesses/:id/sales` | Historial de ventas (paginado simple, más recientes primero) |

### `POST /businesses/:id/sales` — venta rápida

Body (`CreateSaleDto`):
```
{
  customerId?: string,
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
  amountReceived?: number,   // efectivo
  items: { productId?: string, description: string, quantity: number, unitPrice: number, taxRate: number }[]
}
```

Lógica del servicio (todo dentro de una transacción Prisma `$transaction`):
1. Validar acceso a la empresa (mismo patrón que invoices/customers).
2. Calcular por ítem `total = quantity * unitPrice`; `tax` = suma de `quantity * unitPrice * taxRate/100`; `subtotal` = suma de `quantity * unitPrice`; `total = subtotal + tax`.
3. Generar `number` = `SALE-` + contador de ventas de la empresa + 1, con padding a 4 dígitos (mismo patrón que facturas).
4. Crear `Sale` + `SaleItem[]`.
5. Descontar inventario: para cada ítem con `productId`, llamar `productsService.adjustStock(productId, quantity, 'subtract')` (solo afecta a productos con `trackInventory`; permite negativo).
6. Crear un `bizTransaction` tipo `INCOME` con `amount = total`, `description = "Venta " + number`, `date = now`.
7. Devolver la venta creada (con items) y un arreglo `warnings: string[]` con los productos cuyo stock quedó por debajo de 0 (o del mínimo), para que el frontend los muestre. (El aviso NO bloquea la venta.)

### `GET /businesses/:id/sales`

Devuelve las ventas de la empresa (con `items` y `customer`), ordenadas por `createdAt` desc, con un límite razonable (p. ej. 100). Para historial/recibos.

## Opción "generar factura"

Cuando el usuario elige "generar factura" en el cobro, el **frontend** usa el flujo de facturas ya existente en vez del endpoint de ventas:
1. `POST /businesses/:id/invoices` con los ítems del carrito y `customerId` (el create de facturas ya numera FV-XXXX y descuenta inventario).
2. Marcar la factura como pagada: `PATCH` de estado a `PAID` (endpoint `updateStatus` existente).
3. El método de pago se guarda en el campo `notes` de la factura (ej. "Pagado con Efectivo").

Así no se duplica lógica de inventario ni numeración, y la venta aparece en reportes/top-productos como cualquier factura PAID. (No crea `Sale` ni `bizTransaction` adicional: la factura PAID ya es la fuente de ingreso en reportes.)

## Frontend — pantalla POS

Archivo: `frontend/src/app/(dashboard)/empresas/[id]/(shell)/vender/page.tsx` (reemplaza el stub). Renderiza contenido dentro del shell (barra lateral ya provista).

### Layout
- **Panel de productos (izquierda / principal):** input de búsqueda (por nombre o SKU) + cuadrícula de cards de productos activos. Cada card: nombre, precio, stock (si `trackInventory`). Al tocar, se agrega 1 al carrito (o incrementa si ya está).
- **Panel de carrito (derecha / inferior en móvil):** lista de ítems con cantidad editable (+/−, o input), precio y subtotal por línea, botón quitar. Totales: subtotal, IVA, total. Botón "Cobrar".
- **Aviso de stock:** si la cantidad de un ítem supera el stock disponible de un producto con inventario, mostrar un indicador de advertencia en la línea; NO impide cobrar.

### Flujo de cobro (modal)
1. Resumen del total.
2. Selector de modo: **Venta rápida** | **Generar factura**.
3. Método de pago: Efectivo / Tarjeta / Transferencia.
4. Si Efectivo: campo "Monto recibido" → muestra el **cambio** (recibido − total; si es negativo, deshabilita confirmar).
5. Cliente opcional (buscador de clientes; por defecto "Cliente ocasional" / ninguno).
6. Confirmar:
   - **Venta rápida** → `POST /businesses/:id/sales`.
   - **Generar factura** → crear factura + marcar PAID (con el método de pago en notas).
7. Al éxito → **recibo**.

### Recibo
Vista imprimible (usar `window.print()` o una sección con estilos de impresión) con: nombre del negocio, número (SALE-XXXX o FV-XXXX), fecha, ítems, subtotal/IVA/total, método de pago y (efectivo) cambio. Botones: "Imprimir" y "Nueva venta" (limpia el carrito y vuelve al POS).

### Datos
- Productos: `GET /businesses/:id/products` (ya existe) — filtrar activos en el cliente.
- Clientes: `GET /businesses/:id/customers` (ya existe) para el selector.
- Usa `formatCurrency` y la moneda del negocio, como el resto del módulo.

## Integración con reportes/KPIs
- **Venta rápida:** el `bizTransaction` INCOME hace que el ingreso aparezca en el KPI del dashboard y en el P&L de reportes.
- **Factura:** la factura PAID aparece en el P&L y en top-productos (vía `invoiceItem`). Consistente con el comportamiento actual del sistema.
- No hay doble conteo: cada venta produce exactamente una fuente de ingreso (un `bizTransaction` O una factura PAID, nunca ambos).

## Casos borde
- Carrito vacío → botón "Cobrar" deshabilitado.
- Efectivo con monto recibido < total → confirmar deshabilitado.
- Producto sin `trackInventory` → no se ajusta stock ni se avisa.
- Cantidad decimal permitida (productos por peso) — `quantity: Float`.
- Cliente eliminado / no seleccionado → venta "ocasional" sin `customerId`.

## Verificación
Patrón del proyecto: `npx tsc --noEmit` (backend y frontend) por tarea + prueba manual (agregar productos al carrito, cobrar en ambos modos, verificar descuento de stock, ingreso reflejado en KPIs/reportes, recibo, aviso de stock). Sin tests unitarios.

## Fuera de alcance (YAGNI)
- Integración DIAN / factura electrónica.
- Pasarelas de pago electrónicas reales.
- Descuentos por línea, propinas, apertura/cierre de caja, múltiples cajeros.
- Devoluciones/anulaciones de venta (se puede añadir después).
