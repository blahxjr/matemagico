'use client';

import { Alert, Button } from '@matemagico/ui';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Alert tone="error" title="Não foi possível carregar a página.">
        {error.message}
      </Alert>
      <div>
        <Button variant="secondary" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
