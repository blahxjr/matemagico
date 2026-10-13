'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn, focusRing } from '../cn';

export interface DropdownItem {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface DropdownProps {
  label: string;
  items: readonly DropdownItem[];
  className?: string;
}

export function Dropdown({ label, items, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) refs.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(0);
      setOpen(true);
    }
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index >= last ? 0 : index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index <= 0 ? last : index - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(last);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      close();
    }
  };

  return (
    <div ref={root} className={cn('relative inline-block', className)}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setActive(0);
          setOpen((value) => !value);
        }}
        onKeyDown={onTriggerKey}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700',
          focusRing,
        )}
      >
        {label}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 min-w-48 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg"
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(node) => {
                refs.current[index] = node;
              }}
              role="menuitem"
              type="button"
              tabIndex={index === active ? 0 : -1}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                close();
              }}
              className={cn(
                'block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50',
                focusRing,
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
