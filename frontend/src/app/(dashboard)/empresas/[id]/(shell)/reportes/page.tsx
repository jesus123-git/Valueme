'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, AlertCircle, Package } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PnLMonth { month: string; income: number; expenses: number; profit: number }
interface PnLData {
  data: PnLMonth[];
  summary: { totalIncome: number; totalExpenses: number; netProfit: number; margin: number };
}
interface ReceivablesData {
  totalPending: number; overdueCount: number;
  byCustomer: { customerName: string; total: number; count: number }[];
}
interface PayablesData {
  totalPayable: number; overdueCount: number;
  bySupplier: { supplierName: string; total: number; count: number }[];
}
interface TopProduct { name: string; quantity: number; revenue: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function formatCOPFull(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: {formatCOPFull(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Componentes menores ──────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const [pnlMonths, setPnlMonths] = useState(12);
  const [tab, setTab] = useState<'pnl' | 'receivables' | 'payables' | 'products'>('pnl');

  const { data: pnl, isLoading: loadingPnl } = useQuery({
    queryKey: ['reports-pnl', businessId, pnlMonths],
    queryFn: async () => (await api.get<PnLData>(`/businesses/${businessId}/reports/pnl?months=${pnlMonths}`)).data,
    enabled: !!businessId,
  });

  const { data: receivables } = useQuery({
    queryKey: ['reports-receivables', businessId],
    queryFn: async () => (await api.get<ReceivablesData>(`/businesses/${businessId}/reports/receivables`)).data,
    enabled: !!businessId,
  });

  const { data: payables } = useQuery({
    queryKey: ['reports-payables', businessId],
    queryFn: async () => (await api.get<PayablesData>(`/businesses/${businessId}/reports/payables`)).data,
    enabled: !!businessId,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['reports-top-products', businessId],
    queryFn: async () => (await api.get<TopProduct[]>(`/businesses/${businessId}/reports/top-products`)).data,
    enabled: !!businessId,
  });

  const tabs = [
    { key: 'pnl', label: 'P&L' },
    { key: 'receivables', label: 'Cartera' },
    { key: 'payables', label: 'Por pagar' },
    { key: 'products', label: 'Productos' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/empresas/${businessId}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white">Reportes</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* KPIs resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Ingresos totales"
            value={formatCOP(pnl?.summary.totalIncome ?? 0)}
            sub={`Últimos ${pnlMonths} meses`}
            icon={TrendingUp}
            color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
          <KPICard
            label="Gastos totales"
            value={formatCOP(pnl?.summary.totalExpenses ?? 0)}
            sub={`Últimos ${pnlMonths} meses`}
            icon={TrendingDown}
            color="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"
          />
          <KPICard
            label="Utilidad neta"
            value={formatCOP(pnl?.summary.netProfit ?? 0)}
            sub={`Margen: ${(pnl?.summary.margin ?? 0).toFixed(1)}%`}
            icon={DollarSign}
            color={`${(pnl?.summary.netProfit ?? 0) >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}
          />
          <KPICard
            label="Cartera pendiente"
            value={formatCOP(receivables?.totalPending ?? 0)}
            sub={receivables?.overdueCount ? `${receivables.overdueCount} vencida(s)` : 'Al día'}
            icon={AlertCircle}
            color={receivables?.overdueCount ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-sm font-medium transition ${tab === t.key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── P&L ── */}
            {tab === 'pnl' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Ingresos vs Gastos</h2>
                  <select
                    value={pnlMonths}
                    onChange={(e) => setPnlMonths(Number(e.target.value))}
                    className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={3}>Últimos 3 meses</option>
                    <option value={6}>Últimos 6 meses</option>
                    <option value={12}>Último año</option>
                  </select>
                </div>

                {loadingPnl ? (
                  <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={pnl?.data} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(val) => <span className="text-xs text-gray-600 dark:text-gray-300">{val}</span>} />
                        <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Línea de utilidad */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Utilidad neta por mes</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={pnl?.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone" dataKey="profit" name="Utilidad"
                            stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tabla resumen */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 dark:text-gray-500 text-xs">
                            <th className="text-left pb-2">Mes</th>
                            <th className="text-right pb-2">Ingresos</th>
                            <th className="text-right pb-2">Gastos</th>
                            <th className="text-right pb-2">Utilidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {pnl?.data.slice().reverse().map((row) => (
                            <tr key={row.month}>
                              <td className="py-2 text-gray-700 dark:text-gray-300 font-medium">{row.month}</td>
                              <td className="py-2 text-right text-green-600 dark:text-green-400">{formatCOPFull(row.income)}</td>
                              <td className="py-2 text-right text-red-500 dark:text-red-400">{formatCOPFull(row.expenses)}</td>
                              <td className={`py-2 text-right font-semibold ${row.profit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                                {formatCOPFull(row.profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Cartera ── */}
            {tab === 'receivables' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Cartera por cobrar</h2>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOPFull(receivables?.totalPending ?? 0)}</span>
                </div>

                {receivables?.overdueCount ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle size={16} />
                    {receivables.overdueCount} factura(s) vencida(s)
                  </div>
                ) : null}

                {!receivables?.byCustomer.length ? (
                  <p className="text-center py-10 text-gray-400 dark:text-gray-500">No hay cartera pendiente 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {receivables?.byCustomer.map((c, i) => {
                      const pct = receivables.totalPending > 0 ? (c.total / receivables.totalPending) * 100 : 0;
                      return (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{c.customerName}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCOPFull(c.total)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{c.count} fact.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Por pagar ── */}
            {tab === 'payables' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Cuentas por pagar</h2>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOPFull(payables?.totalPayable ?? 0)}</span>
                </div>

                {payables?.overdueCount ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={16} />
                    {payables.overdueCount} orden(es) vencida(s)
                  </div>
                ) : null}

                {!payables?.bySupplier.length ? (
                  <p className="text-center py-10 text-gray-400 dark:text-gray-500">No hay cuentas pendientes por pagar 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {payables?.bySupplier.map((s, i) => {
                      const pct = (payables?.totalPayable ?? 0) > 0 ? (s.total / (payables?.totalPayable ?? 1)) * 100 : 0;
                      return (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{s.supplierName}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCOPFull(s.total)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{s.count} orden(es)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Top productos ── */}
            {tab === 'products' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Top productos por ingresos</h2>
                {!topProducts?.length ? (
                  <div className="text-center py-10">
                    <Package size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">Aún no hay facturas pagadas con productos</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tickFormatter={formatCOP} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 dark:text-gray-500 text-xs">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-right pb-2">Unidades</th>
                          <th className="text-right pb-2">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {topProducts.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2 text-gray-700 dark:text-gray-300">{p.name}</td>
                            <td className="py-2 text-right text-gray-500 dark:text-gray-400">{p.quantity.toFixed(0)}</td>
                            <td className="py-2 text-right font-semibold text-gray-900 dark:text-white">{formatCOPFull(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
