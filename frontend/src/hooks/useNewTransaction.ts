'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  calcOptimisticDeltas,
  type OptimisticTransaction,
} from './useDashboard';
import type { BankAccount, Transaction } from '@/types/dashboard.types';
import { TransactionType } from '@/types/api.enums';

// ─── Tipos locales del formulario ─────────────────────────────────────────────

export interface Category { id: string; name: string }

export interface TransactionFormState {
  type: TransactionType;
  amount: string;          // string mientras se edita; parseado al enviar
  description: string;
  bankAccountId: string;
  destinationBankAccountId: string;
  categoryId: string;
  date: string;            // YYYY-MM-DD para el input date
}

export interface FormErrors {
  amount?: string;
  description?: string;
  bankAccountId?: string;
  destinationBankAccountId?: string;
  categoryId?: string;
}

const EMPTY_FORM: TransactionFormState = {
  type:                     TransactionType.EXPENSE,
  amount:                   '',
  description:              '',
  bankAccountId:            '',
  destinationBankAccountId: '',
  categoryId:               '',
  date:                     new Date().toISOString().split('T')[0],
};

// ─── Validación cliente ───────────────────────────────────────────────────────

function validate(form: TransactionFormState): FormErrors {
  const errors: FormErrors = {};
  const amount = parseFloat(form.amount);

  if (!form.amount || isNaN(amount) || amount <= 0)
    errors.amount = 'Ingresa un monto mayor a $0';

  if (!form.description.trim())
    errors.description = 'La descripción es obligatoria';

  if (!form.bankAccountId)
    errors.bankAccountId = 'Selecciona una cuenta';

  if (form.type === TransactionType.TRANSFER) {
    if (!form.destinationBankAccountId)
      errors.destinationBankAccountId = 'Selecciona la cuenta destino';
    else if (form.destinationBankAccountId === form.bankAccountId)
      errors.destinationBankAccountId = 'La cuenta destino debe ser distinta a la origen';
  }

  if (!form.categoryId)
    errors.categoryId = 'Selecciona una categoría';

  return errors;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseNewTransactionOptions {
  accounts: BankAccount[];
  onOptimisticApply:   (opt: OptimisticTransaction) => void;
  onOptimisticRevert:  (opt: OptimisticTransaction) => void;
  onOptimisticConfirm: (tempId: string, realTx: Transaction) => void;
  onSuccess: () => void;   // cierra el modal
}

export function useNewTransaction({
  accounts,
  onOptimisticApply,
  onOptimisticRevert,
  onOptimisticConfirm,
  onSuccess,
}: UseNewTransactionOptions) {
  const [form,       setForm]       = useState<TransactionFormState>(EMPTY_FORM);
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [apiError,   setApiError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // ── Cargar categorías ─────────────────────────────────────────────────────
  // Se cargan cuando el modal abre. Las cuentas ya vienen del dashboard.

  useEffect(() => {
    setLoadingMeta(true);
    apiGet<Category[]>('/categories')
      .then(setCategories)
      .catch(() => setApiError('No se pudieron cargar las categorías'))
      .finally(() => setLoadingMeta(false));
  }, []);

  // ── Setters ───────────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof TransactionFormState>(key: K, value: TransactionFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      // Borra el error del campo que el usuario está corrigiendo
      if (errors[key as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors],
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError('');
  }, []);

  // ── Envío con actualización optimista ─────────────────────────────────────

  const submit = useCallback(async () => {
    setApiError('');
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const amount     = parseFloat(form.amount);
    const originAcct = accounts.find((a) => a.id === form.bankAccountId)!;
    const category   = categories.find((c) => c.id === form.categoryId)!;
    const tempId     = `temp_${Date.now()}`;

    // ── 1. Construir la transacción optimista ─────────────────────────────
    const optimisticTx: Transaction = {
      id:          tempId,
      amount,
      description: form.description,
      type:        form.type,
      date:        new Date(form.date).toISOString(),
      createdAt:   new Date().toISOString(),
      userId:      '',   // no importa para la UI
      bankAccount: { id: originAcct.id, name: originAcct.name, currency: originAcct.currency },
      category:    { id: category.id,   name: category.name },
    };

    const deltas = calcOptimisticDeltas(form.type, amount);
    const optimistic: OptimisticTransaction = {
      tempId,
      transaction: optimisticTx,
      ...deltas,
    };

    // ── 2. Aplicar el cambio en la UI INMEDIATAMENTE ──────────────────────
    onOptimisticApply(optimistic);
    onSuccess();    // cierra el modal: el usuario ve el resultado al instante
    resetForm();

    setSubmitting(true);
    try {
      // ── 3. Petición real al servidor ──────────────────────────────────
      const realTx = await apiPost<Transaction>('/transactions', {
        amount,
        description: form.description,
        type:        form.type,
        bankAccountId: form.bankAccountId,
        categoryId:    form.categoryId,
        date:          new Date(form.date).toISOString(),
        ...(form.type === TransactionType.TRANSFER && {
          destinationBankAccountId: form.destinationBankAccountId,
        }),
      });

      // ── 4. Sustituir ID temporal por el ID real ───────────────────────
      onOptimisticConfirm(tempId, realTx);
    } catch (err) {
      // ── 5. Si falla: revertir el estado optimista y mostrar el error ──
      onOptimisticRevert(optimistic);
      // El modal ya se cerró, mostramos el error como un toast/banner global
      // que el componente padre puede renderizar usando `submitError`.
      setApiError(err instanceof Error ? err.message : 'Error al guardar la transacción');
    } finally {
      setSubmitting(false);
    }
  }, [
    form, accounts, categories,
    onOptimisticApply, onOptimisticRevert, onOptimisticConfirm,
    onSuccess, resetForm,
  ]);

  return {
    form, errors, apiError, submitting, loadingMeta,
    categories, setField, resetForm, submit,
  };
}
