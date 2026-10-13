import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppNav } from '../../components/AppNav';
import { LogoutButton } from '../../components/LogoutButton';
import { navigationFor, primaryRole, ROLE_LABELS } from '../../lib/navigation';
import { getSessionUser } from '../../lib/session';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');

  const items = navigationFor(user.roles);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <span className="font-bold">MateMágico Champions</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">
            {user.name} · {ROLE_LABELS[primaryRole(user.roles)]}
          </span>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:flex-row lg:gap-8">
        <AppNav items={items} />
        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
