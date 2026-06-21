'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { upgradeModalBus } from '@/lib/upgradeModalBus';
import { UpgradeModal } from '@/components/ui/UpgradeModal';

interface UpgradeModalContextValue {
  showUpgrade: (code: string) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    return upgradeModalBus.on(code => setErrorCode(code));
  }, []);

  return (
    <UpgradeModalContext.Provider value={{ showUpgrade: setErrorCode }}>
      {children}
      <UpgradeModal
        open={errorCode !== null}
        errorCode={errorCode ?? ''}
        onClose={() => setErrorCode(null)}
      />
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used inside UpgradeModalProvider');
  return ctx;
}
