'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, X, AlertTriangle, Printer, ShoppingCart } from 'lucide-react';

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

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-white">Cobrar {formatCurrency(totals.total, currency)}</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
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
