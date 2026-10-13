import { EmptyState, PageHeader } from '@matemagico/ui';
import { PerformanceCards } from '../../../../components/PerformanceCards';
import { fetchMembers, fetchPerformance } from '../../../../lib/admin-data';
import { nameResolver, requireStaffContext } from '../../../../lib/admin-guard';
import { messageForError } from '../../../../lib/errors';
import { fetchTopicNames } from '../../../../lib/student-data';

export const metadata = { title: 'Desempenho | MateMágico Champions' };

export default async function AdminPerformancePage() {
  const ctx = await requireStaffContext('/app/admin/performance');
  const header = (
    <PageHeader title="Desempenho" description="Médias por aluno e acertos por tema." />
  );
  if (!ctx.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState title="Nenhuma escola vinculada" description="Vincule-se a uma escola." />
      </div>
    );
  }
  const scoped = { ...ctx, schoolId: ctx.schoolId };
  const [performance, members, topicNames] = await Promise.all([
    fetchPerformance(scoped),
    ctx.user.roles.includes('SCHOOL_ADMIN') ? fetchMembers(scoped) : Promise.resolve(null),
    fetchTopicNames(scoped),
  ]);
  if (!performance.data) throw new Error(messageForError(performance.errorCode));
  if (members && !members.data) throw new Error(messageForError(members.errorCode));
  const studentName = nameResolver(
    members?.data?.items.map((m) => ({ id: m.userId, name: m.name })) ?? [],
    'Aluno',
  );
  const topicName = nameResolver(
    Object.entries(topicNames).map(([id, name]) => ({ id, name })),
    'Tema',
  );

  return (
    <div className="flex flex-col gap-6">
      {header}
      {performance.data.students.length === 0 ? (
        <EmptyState
          title="Sem dados de desempenho"
          description="Os dados aparecem quando os alunos concluírem simulados."
        />
      ) : (
        <PerformanceCards
          students={performance.data.students}
          topics={performance.data.topics}
          studentName={studentName}
          topicName={topicName}
        />
      )}
    </div>
  );
}
