'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../cn';
import type { AlertTone } from './display';

export interface ToastMessage {
  id: number;
  tone: AlertTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: AlertTone) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneClass: Record<AlertTone, string> = {
  info: 'border-cyan-700 bg-cyan-950 text-cyan-100',
  success: 'border-emerald-700 bg-emerald-950 text-emerald-100',
  warning: 'border-amber-700 bg-amber-950 text-amber-100',
  error: 'border-rose-700 bg-rose-950 text-rose-100',
};

export function ToastProvider({
  children,
  durationMs = 5000,
}: {
  children: ReactNode;
  durationMs?: number;
}) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: AlertTone = 'info') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((items) => [...items, { id, tone, message }]);
      if (durationMs > 0) setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss, durationMs],
  );

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notificações"
        className="fixed inset-x-2 bottom-2 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-start justify-between gap-3 rounded-lg border p-3 text-sm shadow-lg',
              toneClass[toast.tone],
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => dismiss(toast.id)}
              className="rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
