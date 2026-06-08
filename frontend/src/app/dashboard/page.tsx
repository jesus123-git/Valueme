import { redirect } from 'next/navigation';

// Ruta legacy – redirige al nuevo módulo personal.
export default function DashboardLegacyPage() {
  redirect('/personal');
}
