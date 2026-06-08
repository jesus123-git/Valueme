import { type ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/workspace.context';

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Layout compartido para todos los routes bajo (dashboard)/:
//   /personal  — Módulo de Finanzas Personales
//   /empresas  — Módulo de Finanzas Empresariales
//
// Inyecta WorkspaceProvider para que cualquier página hija tenga acceso
// al modo activo (personal | empresas) y al color de acento correspondiente.

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
}
