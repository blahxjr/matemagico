import { Badge, Card, EmptyState, PageHeader } from '@matemagico/ui';
import { primaryRole, ROLE_LABELS } from '../../../lib/navigation';
import { getSessionUser } from '../../../lib/session';
import { messageForError } from '../../../lib/errors';

export const metadata = { title: 'Dashboard | MateMágico Champions' };

export default async function DashboardPage() {
  const { user, errorCode } = await getSessionUser();
  if (!user) throw new Error(messageForError(errorCode));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Olá, ${user.name}`} description="Resumo da sua conta." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card aria-label="Perfil">
          <h2 className="text-sm text-slate-400">Nome</h2>
          <p className="text-lg font-semibold">{user.name}</p>
          <h2 className="mt-3 text-sm text-slate-400">Papel</h2>
          <Badge tone="info">{ROLE_LABELS[primaryRole(user.roles)]}</Badge>
        </Card>
        <Card aria-label="Resumo">
          <h2 className="text-sm text-slate-400">Resumo</h2>
          <p className="text-lg font-semibold">
            {user.schools.length} {user.schools.length === 1 ? 'escola' : 'escolas'}
          </p>
          <p className="text-sm text-slate-400">{user.email}</p>
        </Card>
      </div>
      <section aria-labelledby="escolas-titulo">
        <h2 id="escolas-titulo" className="mb-3 text-xl font-semibold">
          Escolas
        </h2>
        {user.schools.length === 0 ? (
          <EmptyState
            title="Nenhuma escola vinculada"
            description="Quando você for vinculado a uma escola, ela aparecerá aqui."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {user.schools.map((school) => (
              <li key={school.membershipId}>
                <Card>
                  <p className="font-semibold">{school.name}</p>
                  <p className="text-sm text-slate-400">{school.roles.join(', ')}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
