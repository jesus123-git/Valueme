import { type ReactNode } from 'react';
import { BusinessShell } from '@/components/business/BusinessShell';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <BusinessShell>{children}</BusinessShell>;
}
