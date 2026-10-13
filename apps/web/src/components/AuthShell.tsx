import type { ReactNode } from 'react';
import { Card } from '@matemagico/ui';

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md" aria-labelledby="auth-title">
        <h1 id="auth-title" className="mb-4 text-2xl font-bold text-slate-50">
          {title}
        </h1>
        {children}
        <p className="mt-4 text-sm text-slate-400">{footer}</p>
      </Card>
    </main>
  );
}
