'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@matemagico/ui';
import { GENERIC_ERROR } from '../lib/errors';

export function StartExamButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/exams/${examId}/start`, { method: 'POST' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? GENERIC_ERROR);
        return;
      }
      router.refresh();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error" title={error} />}
      <div>
        <Button onClick={start} loading={loading}>
          Iniciar simulado
        </Button>
      </div>
    </div>
  );
}
