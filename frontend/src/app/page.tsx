import { redirect } from 'next/navigation';

// La raíz redirige al módulo personal.
// El middleware se encarga de enviar a /login si no hay sesión activa.
export default function RootPage() {
  redirect('/personal');
}
