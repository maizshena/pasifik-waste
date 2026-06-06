// src/hooks/useToast.ts
'use client';
import { useState, useCallback } from 'react';
import type { ToastType } from '@/components/ui/Toast';

interface ToastState { id: number; message: string; type: ToastType; }

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, remove };
}