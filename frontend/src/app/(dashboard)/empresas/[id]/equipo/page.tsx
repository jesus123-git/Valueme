'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePlan } from '@/context/PlanContext';
import { useAuth } from '@/context/auth.context';

interface Member { id: string; role: 'EDITOR' | 'VIEWER'; title: string | null; user: { id: string; email: string; name: string | null } }
interface Invite { id: string; email: string; role: 'EDITOR' | 'VIEWER'; expiresAt: string }
interface TeamData { ownerUserId: string; members: Member[]; pendingInvites: Invite[] }

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm';

export default function EquipoPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { usage } = usePlan();
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<Member | null>(null);

  const { data } = useQuery<TeamData>({
    queryKey: ['members', businessId],
    queryFn: async () => (await api.get(`/businesses/${businessId}/members`)).data,
    enabled: !!businessId,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ email: string; role: 'EDITOR' | 'VIEWER'; title: string }>();

  const inviteMutation = useMutation({
    mutationFn: (d: { email: string; role: string; title: string }) => api.post(`/businesses/${businessId}/members/invite`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', businessId] });
      queryClient.invalidateQueries({ queryKey: ['usage', businessId] });
      setShowInvite(false);
      reset();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/businesses/${businessId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', businessId] });
      queryClient.invalidateQueries({ queryKey: ['usage', businessId] });
      setConfirmRemove(null);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) => api.delete(`/businesses/${businessId}/members/invites/${inviteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', businessId] }),
  });

  const transferMutation = useMutation({
    mutationFn: (memberId: string) => api.post(`/businesses/${businessId}/members/transfer`, { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', businessId] });
      setConfirmTransfer(null);
    },
  });

  const isOwner = data?.ownerUserId === user?.id;
  const canInvite = isOwner && (usage?.memberLimit === null || (usage?.membersCount ?? 0) < (usage?.memberLimit ?? 0));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/empresas/${businessId}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white">Equipo</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {(data?.members.length ?? 0) + 1} miembro(s) activo(s)
            {usage?.memberLimit !== null && ` · ${usage?.membersCount ?? 0}/${usage?.memberLimit} adicionales`}
          </p>
          {isOwner && canInvite && (
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
              <Plus size={16} /> Invitar
            </button>
          )}
        </div>

        {showInvite && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Invitar colaborador</h3>
              <button onClick={() => { setShowInvite(false); reset(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="space-y-3">
              <input {...register('email', { required: true })} type="email" placeholder="correo@ejemplo.com" className={inputCls} />
              <select {...register('role', { required: true })} className={inputCls}>
                <option value="EDITOR">Editor — puede crear y editar</option>
                <option value="VIEWER">Visualizador — solo lectura</option>
              </select>
              <input {...register('title')} placeholder="Cargo o descripción (opcional)" className={inputCls} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowInvite(false); reset(); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium transition">{isSubmitting ? 'Enviando...' : 'Enviar invitación'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <UserCheck size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.id === data?.ownerUserId ? 'Tú' : 'Propietario'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
              </div>
            </div>
            <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">Propietario</span>
          </div>

          {data?.members.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  {(m.user.name ?? m.user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user.name ?? m.user.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{m.title ?? m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.role === 'EDITOR' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {m.role === 'EDITOR' ? 'Editor' : 'Visualizador'}
                </span>
                {isOwner && (
                  <>
                    <button onClick={() => setConfirmTransfer(m)} className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition" title="Transferir propiedad"><UserCheck size={15} /></button>
                    <button onClick={() => setConfirmRemove(m)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            </div>
          ))}

          {(data?.pendingInvites.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-4">Invitaciones pendientes</p>
              {data?.pendingInvites.map(inv => (
                <div key={inv.id} className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{inv.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{inv.role === 'EDITOR' ? 'Editor' : 'Visualizador'} · Expira {new Date(inv.expiresAt).toLocaleDateString('es-CO')}</p>
                  </div>
                  {isOwner && <button onClick={() => cancelInviteMutation.mutate(inv.id)} className="text-xs text-red-500 hover:text-red-600 transition">Cancelar</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirmRemove}
          title="Expulsar miembro"
          message={`¿Eliminar el acceso de ${confirmRemove?.user.name ?? confirmRemove?.user.email} a esta empresa?`}
          confirmLabel="Expulsar"
          onConfirm={() => confirmRemove && removeMutation.mutate(confirmRemove.id)}
          onCancel={() => setConfirmRemove(null)}
        />

        <ConfirmDialog
          open={!!confirmTransfer}
          title="Transferir propiedad"
          message={`Vas a transferir la propiedad a ${confirmTransfer?.user.name ?? confirmTransfer?.user.email}. Perderás la capacidad de gestionar el equipo. Pasarás a ser Editor. Esta acción no se puede deshacer sin que el nuevo propietario te la devuelva.`}
          confirmLabel="Transferir"
          onConfirm={() => confirmTransfer && transferMutation.mutate(confirmTransfer.id)}
          onCancel={() => setConfirmTransfer(null)}
        />

      </main>
    </div>
  );
}
