'use client';

import { Store } from 'lucide-react';

export default function VenderPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
        <Store size={26} className="text-violet-600 dark:text-violet-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Vender</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Próximamente — estamos construyendo el punto de venta para registrar tus ventas al instante.
      </p>
    </div>
  );
}
