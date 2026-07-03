import type { ModulePreference, User } from '@/types/auth.types';
import type { WorkspaceMode } from '@/context/workspace.context';

/** Ruta de inicio según la preferencia de módulo. */
export function moduleHomePath(user: Pick<User, 'modulePreference'>): string {
  return user.modulePreference === 'BUSINESS' ? '/empresas' : '/personal';
}

/** Módulos habilitados según la preferencia. */
export function availableModules(pref: ModulePreference): WorkspaceMode[] {
  if (pref === 'PERSONAL') return ['personal'];
  if (pref === 'BUSINESS') return ['empresas'];
  return ['personal', 'empresas'];
}

/** true si la ruta pertenece a un módulo NO habilitado. */
export function isModuleBlocked(pathname: string, pref: ModulePreference): boolean {
  const mods = availableModules(pref);
  if (pathname.startsWith('/empresas')) return !mods.includes('empresas');
  if (pathname.startsWith('/personal')) return !mods.includes('personal');
  return false;
}
