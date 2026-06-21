'use client';

import { useRouter } from 'next/navigation';
import { X, Zap } from 'lucide-react';

const MESSAGES: Record<string, { title: string; body: string }> = {
  INVOICE_LIMIT_REACHED:  { title: 'Límite de facturas alcanzado',     body: 'Has usado todas tus facturas del mes en el plan gratuito. Con Nomi PRO creas facturas ilimitadas.' },
  CLIENT_LIMIT_REACHED:   { title: 'Límite de clientes alcanzado',     body: 'Alcanzaste el límite de 15 clientes. Con Nomi PRO puedes añadir clientes ilimitados.' },
  PRODUCT_LIMIT_REACHED:  { title: 'Límite de productos alcanzado',    body: 'Tu catálogo tiene 10 productos activos. Con Nomi PRO tienes productos ilimitados.' },
  QUOTE_LIMIT_REACHED:    { title: 'Límite de cotizaciones alcanzado', body: 'Usaste tus 5 cotizaciones del mes. Con Nomi PRO creas cotizaciones ilimitadas.' },
  SUPPLIER_LIMIT_REACHED: { title: 'Límite de proveedores alcanzado',  body: 'Alcanzaste el límite de 5 proveedores. Con Nomi PRO tienes proveedores ilimitados.' },
  BUSINESS_LIMIT_REACHED: { title: 'Límite de empresas alcanzado',     body: 'Tu plan solo permite 1 empresa activa. Con Nomi Empresa puedes gestionar negocios ilimitados.' },
  MEMBER_LIMIT_REACHED:   { title: 'Límite de equipo alcanzado',       body: 'Tu plan no permite más colaboradores. Actualiza para ampliar tu equipo.' },
  FEATURE_NOT_AVAILABLE:  { title: 'Función exclusiva PRO',            body: 'Las listas de precios diferenciadas están disponibles desde Nomi PRO.' },
};

interface Props {
  open: boolean;
  errorCode: string;
  onClose: () => void;
}

export function UpgradeModal({ open, errorCode, onClose }: Props) {
  const router = useRouter();
  if (!open) return null;
  const msg = MESSAGES[errorCode] ?? { title: 'Actualiza tu plan', body: 'Esta función requiere un plan superior.' };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X size={20} />
          </button>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{msg.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{msg.body}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
          >
            Más tarde
          </button>
          <button
            onClick={() => { onClose(); router.push('/planes'); }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition text-sm"
          >
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}
