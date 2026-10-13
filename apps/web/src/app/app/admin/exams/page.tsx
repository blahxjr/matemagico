import { Card, EmptyState, PageHeader } from '@matemagico/ui';
import { CreateExamForm } from '../../../../components/CreateExamForm';
import { ExamManagementTable } from '../../../../components/ExamManagementTable';
import { fetchAdminExams, fetchTopicOptions } from '../../../../lib/admin-data';
import { requireStaffContext } from '../../../../lib/admin-guard';
import { messageForError } from '../../../../lib/errors';

export const metadata = { title: 'Gestão de simulados | MateMágico Champions' };

export default async function AdminExamsPage() {
  const ctx = await requireStaffContext('/app/admin/exams');
  const header = (
    <PageHeader
      title="Gestão de simulados"
      description="Crie rascunhos e publique simulados. Após publicado, o simulado é imutável."
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
  const scoped = { ...ctx, schoolId: ctx.schoolId };
  const [exams, topics] = await Promise.all([fetchAdminExams(scoped), fetchTopicOptions(scoped)]);
  if (!exams.data) throw new Error(messageForError(exams.errorCode));
  if (!topics.data) throw new Error(messageForError(topics.errorCode));

  return (
    <div className="flex flex-col gap-6">
      {header}
      <Card aria-labelledby="novo-simulado">
        <h2 id="novo-simulado" className="mb-4 text-lg font-semibold text-slate-50">
          Novo simulado
        </h2>
        {topics.data.items.length === 0 ? (
          <EmptyState
            title="Nenhum tema cadastrado"
            description="Cadastre temas e publique questões antes de criar simulados."
          />
        ) : (
          <CreateExamForm topics={topics.data.items} />
        )}
      </Card>
      {exams.data.items.length === 0 ? (
        <EmptyState title="Nenhum simulado" description="Os simulados criados aparecerão aqui." />
      ) : (
        <ExamManagementTable exams={exams.data.items} />
      )}
    </div>
  );
}
