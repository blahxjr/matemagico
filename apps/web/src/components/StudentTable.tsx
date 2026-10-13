import { Badge } from '@matemagico/ui';
import type { SchoolMember } from '../lib/admin-data';
import { MembershipActions } from './MembershipActions';

const STATE: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> =
  {
    ACTIVE: { label: 'Ativo', tone: 'success' },
    PENDING: { label: 'Pendente', tone: 'warning' },
    REVOKED: { label: 'Revogado', tone: 'danger' },
  };

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Aluno',
  TEACHER: 'Professor',
  SCHOOL_ADMIN: 'Administrador',
};

export function StudentTable({ members }: { members: readonly SchoolMember[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Membros da escola</caption>
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            {['Nome', 'E-mail', 'Status', 'Papéis', 'Ações'].map((heading) => (
              <th key={heading} scope="col" className="p-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const state = STATE[member.state] ?? { label: member.state, tone: 'neutral' as const };
            return (
              <tr key={member.membershipId} className="border-t border-slate-800 text-slate-100">
                <th scope="row" className="p-3 font-medium">
                  {member.name}
                </th>
                <td className="p-3">{member.email}</td>
                <td className="p-3">
                  <Badge tone={state.tone}>{state.label}</Badge>
                </td>
                <td className="p-3">
                  {member.roles.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1" aria-label={`Papéis de ${member.name}`}>
                      {member.roles.map((role) => (
                        <li key={role}>
                          <Badge tone="info">{ROLE_LABEL[role] ?? role}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-3">
                  <MembershipActions member={member} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
