'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@matemagico/ui';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={onClick} loading={loading} aria-label="Sair da conta">
      Sair
    </Button>
  );
}
