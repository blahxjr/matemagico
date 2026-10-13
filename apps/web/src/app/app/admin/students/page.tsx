import { EmptyState, PageHeader } from '@matemagico/ui';
import { StudentTable } from '../../../../components/StudentTable';
import { fetchMembers } from '../../../../lib/admin-data';
import { requireStaffContext } from '../../../../lib/admin-guard';
import { messageForError } from '../../../../lib/errors';

export const metadata = { title: 'Alunos | MateMágico Champions' };

export default async function AdminStudentsPage() {
  const ctx = await requireStaffContext('/app/admin/students');
  const header = (
    <PageHeader
      title="Alunos"
      description="Ative vínculos e conceda papéis aos membros da escola."
    />
  );
  if (!ctx.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState title="Nenhuma escola vinculada" description="Vincule-se a uma escola." />
      </div>
    );
  }
  const members = await fetchMembers({ ...ctx, schoolId: ctx.schoolId });
  if (!members.data) throw new Error(messageForError(members.errorCode));

  return (
    <div className="flex flex-col gap-6">
      {header}
      {members.data.items.length === 0 ? (
        <EmptyState
          title="Nenhum membro"
          description="Quando alguém for vinculado à escola, aparecerá aqui."
        />
      ) : (
        <StudentTable members={members.data.items} />
      )}
    </div>
  );
}
