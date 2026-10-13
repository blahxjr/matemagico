'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@matemagico/ui';
import { callBff } from '../lib/bff-client';

export function PublishExamButton({ examId, title }: { examId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setLoading(true);
    setError(null);
    const result = await callBff(`/api/exams/${examId}/publish`, 'POST', {});
    setLoading(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="error" title={error} />}
      <div>
        <Button onClick={publish} loading={loading} aria-label={`Publicar ${title}`}>
          Publicar
        </Button>
      </div>
    </div>
  );
}
