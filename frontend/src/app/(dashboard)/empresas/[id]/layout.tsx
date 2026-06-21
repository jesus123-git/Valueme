import { type ReactNode } from 'react';
import { PlanProvider } from '@/context/PlanContext';
import { UpgradeModalProvider } from '@/context/UpgradeModalContext';

export default function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <PlanProvider businessId={params.id}>
      <UpgradeModalProvider>
        {children}
      </UpgradeModalProvider>
    </PlanProvider>
  );
}
