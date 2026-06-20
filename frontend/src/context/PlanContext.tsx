'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface UsageStats {
  plan: 'FREE' | 'PRO' | 'EMPRESA';
  planExpiresAt: string | null;
  invoicesThisMonth: number; invoiceLimit: number | null;
  customersCount: number;    customerLimit: number | null;
  productsCount: number;     productLimit: number | null;
  quotesThisMonth: number;   quoteLimit: number | null;
  suppliersCount: number;    supplierLimit: number | null;
  membersCount: number;      memberLimit: number | null;
  canUsePriceLists: boolean;
  canAddBusiness: boolean;
}

interface PlanContextValue {
  plan: 'FREE' | 'PRO' | 'EMPRESA';
  usage: UsageStats | null;
  isLoading: boolean;
  refetch: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children, businessId }: { children: ReactNode; businessId: string }) {
  const { data, isLoading, refetch } = useQuery<UsageStats>({
    queryKey: ['usage', businessId],
    queryFn: async () => (await api.get(`/businesses/${businessId}/usage`)).data,
    enabled: !!businessId,
    staleTime: 30_000,
  });

  return (
    <PlanContext.Provider value={{ plan: data?.plan ?? 'FREE', usage: data ?? null, isLoading, refetch }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}
