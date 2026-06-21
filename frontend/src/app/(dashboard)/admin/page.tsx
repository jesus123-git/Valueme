'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth.context';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Shield, Users, TrendingUp, Gift, UserCheck, Clock } from 'lucide-react';

interface Stats {
  totalUsers: number;
  byPlan: { FREE: number; PRO: number; EMPRESA: number };
  paidPlans: { PRO: number; EMPRESA: number };
  grantedPlans: { PRO: number; EMPRESA: number };
  mrr: number;
  mrrLost: number;
  newUsersLast30Days: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'EMPRESA';
  isStaff: boolean;
  planGrantedByAdmin: boolean;
  createdAt: string;
  _count: { businesses: number };
}

interface HistoryItem {
  id: string;
  fromPlan: string;
  toPlan: string;
  grantedByAdmin: boolean;
  note: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  changedBy: { id: string; email: string; name: string | null } | null;
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

const PLAN_COLORS: Record<string, string> = {
  FREE:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  PRO:     'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  EMPRESA: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'history'>('users');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<Record<string, string>>({});

  if (user && !user.isStaff) {
    router.replace('/personal');
    return null;
  }

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
  });

  const { data: users } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get('/admin/users')).data,
  });

  const { data: history } = useQuery<{ total: number; items: HistoryItem[] }>({
    queryKey: ['admin', 'history'],
    queryFn: async () => (await api.get('/admin/history?limit=100')).data,
    enabled: activeTab === 'history',
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan, note }: { id: string; plan: string; note?: string }) =>
      api.patch(`/admin/users/${id}/plan`, { plan, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const staffMutation = useMutation({
    mutationFn: ({ id, isStaff }: { id: string; isStaff: boolean }) =>
      api.patch(`/admin/users/${id}/staff`, { isStaff }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-gray-900 dark:text-white">Panel de administración</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users,      label: 'Total usuarios',   value: stats?.totalUsers ?? '—' },
            { icon: TrendingUp, label: 'MRR real',         value: stats ? formatCOP(stats.mrr) : '—' },
            { icon: Gift,       label: 'Planes regalados', value: stats ? `${(stats.grantedPlans.PRO ?? 0) + (stats.grantedPlans.EMPRESA ?? 0)} usu. · ${formatCOP(stats.mrrLost)}` : '—' },
            { icon: UserCheck,  label: 'Nuevos este mes',  value: stats?.newUsersLast30Days ?? '—' },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-2">
                <card.icon size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{String(card.value)}</p>
            </div>
          ))}
        </div>

        {stats && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribución de planes</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['FREE', 'PRO', 'EMPRESA'] as const).map(plan => (
                <div key={plan} className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.byPlan[plan] ?? 0}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[plan]}`}>{plan}</span>
                  {plan !== 'FREE' && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {stats.paidPlans[plan] ?? 0} pago · {stats.grantedPlans[plan] ?? 0} regalo
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['users', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === tab ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {tab === 'users' ? 'Usuarios' : 'Historial'}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {['Usuario', 'Plan', 'Staff', 'Empresas', 'Registro', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {(users ?? []).map(u => (
                  <Fragment key={u.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{u.name ?? '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.plan]}`}>{u.plan}</span>
                        {u.planGrantedByAdmin && <span className="ml-1 text-xs text-amber-500">regalo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => staffMutation.mutate({ id: u.id, isStaff: !u.isStaff })}
                          disabled={staffMutation.isPending}
                          className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${u.isStaff ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span className={`inline-block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${u.isStaff ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u._count.businesses}</td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {expandedUserId === u.id ? 'Cerrar' : 'Cambiar plan'}
                        </button>
                      </td>
                    </tr>
                    {expandedUserId === u.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-blue-50/40 dark:bg-blue-900/10">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Cambiar a:</span>
                            {(['FREE', 'PRO', 'EMPRESA'] as const).map(plan => (
                              <button
                                key={plan}
                                disabled={u.plan === plan || planMutation.isPending}
                                onClick={() => planMutation.mutate({ id: u.id, plan, note: planNote[u.id] || undefined })}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${u.plan === plan ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700' : 'border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}
                              >
                                {plan}
                              </button>
                            ))}
                            <input
                              type="text"
                              placeholder="Nota opcional..."
                              value={planNote[u.id] ?? ''}
                              onChange={e => setPlanNote(prev => ({ ...prev, [u.id]: e.target.value }))}
                              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-[160px]"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Historial de cambios de plan</span>
              <span className="ml-auto text-xs text-gray-400">{history?.total ?? 0} entradas</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {(history?.items ?? []).map(h => (
                <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{h.user.name ?? h.user.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{h.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[h.fromPlan]}`}>{h.fromPlan}</span>
                    <span className="text-gray-400">→</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[h.toPlan]}`}>{h.toPlan}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{h.changedBy ? (h.changedBy.name ?? h.changedBy.email) : 'Sistema'}</p>
                    {h.note && <p className="text-xs text-gray-400 dark:text-gray-500 italic">{h.note}</p>}
                    <p className="text-xs text-gray-300 dark:text-gray-600">{new Date(h.createdAt).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
              {(history?.items ?? []).length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">Sin cambios registrados aún</p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
