'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Select } from '@matemagico/ui';
import { callBff } from '../lib/bff-client';

const OPTIONS = [
  { value: 'STUDENT', label: 'Aluno' },
  { value: 'TEACHER', label: 'Professor' },
  { value: 'SCHOOL_ADMIN', label: 'Administrador da escola' },
];

export function RoleSelector({
  membershipId,
  memberName,
  currentRoles,
}: {
  membershipId: string;
  memberName: string;
  currentRoles: readonly string[];
}) {
  const router = useRouter();
  const available = OPTIONS.filter((option) => !currentRoles.includes(option.value));
  const [role, setRole] = useState(available[0]?.value ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (available.length === 0)
    return <span className="text-sm text-slate-400">Todos os papéis</span>;

  async function grant() {
    setLoading(true);
    setError(null);
    const result = await callBff(`/api/memberships/${membershipId}/grants`, 'POST', {
      roleId: role,
    });
    setLoading(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Select
        label={`Papel para ${memberName}`}
        options={available}
        value={role}
        onChange={(event) => setRole(event.target.value)}
      />
      <Button
        variant="secondary"
        onClick={grant}
        loading={loading}
        aria-label={`Conceder papel a ${memberName}`}
      >
        Conceder
      </Button>
      {error && <Alert tone="error" title={error} />}
    </div>
  );
}
