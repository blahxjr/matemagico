'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@matemagico/ui';
import { callBff } from '../lib/bff-client';
import type { SchoolMember } from '../lib/admin-data';
import { RoleSelector } from './RoleSelector';

/** PENDING members can be activated; ACTIVE members can receive roles. */
export function MembershipActions({ member }: { member: SchoolMember }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setLoading(true);
    setError(null);
    const result = await callBff(`/api/memberships/${member.membershipId}/activate`, 'POST', {});
    setLoading(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  }

  if (member.state === 'PENDING') {
    return (
      <div className="flex flex-col gap-2">
        {error && <Alert tone="error" title={error} />}
        <div>
          <Button onClick={activate} loading={loading} aria-label={`Ativar ${member.name}`}>
            Ativar
          </Button>
        </div>
      </div>
    );
  }
  if (member.state === 'ACTIVE') {
    return (
      <RoleSelector
        membershipId={member.membershipId}
        memberName={member.name}
        currentRoles={member.roles}
      />
    );
  }
  return <span className="text-sm text-slate-400">Sem ações</span>;
}
