'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@matemagico/ui';
import type { NavItem } from '../lib/navigation';

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Navegação principal" className="w-full lg:w-60 lg:shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="app-nav-list"
        onClick={() => setOpen((value) => !value)}
        className="mb-2 w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400 lg:hidden"
      >
        {open ? 'Fechar menu' : 'Abrir menu'}
      </button>
      <ul id="app-nav-list" className={cn('flex-col gap-1 lg:flex', open ? 'flex' : 'hidden')}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-cyan-400',
                  active ? 'bg-cyan-900 text-cyan-100' : 'text-slate-300 hover:bg-slate-800',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
