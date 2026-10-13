import Link from 'next/link';
import { EmptyState, PageHeader } from '@matemagico/ui';
import { ExamCard } from '../../../components/ExamCard';
import type { ExamProgress } from '../../../components/ExamCard';
import { messageForError } from '../../../lib/errors';
import { fetchExams, fetchHistory, requireContext, sortByRecent } from '../../../lib/student-data';
import { isStaff } from '../../../lib/navigation';

export const metadata = { title: 'Simulados | MateMágico Champions' };

export default async function ExamsPage() {
  const ctx = await requireContext();
  const header = (
    <PageHeader
      title="Simulados"
      description="Escolha um simulado para começar ou continue de onde parou."
      actions={
        <div className="flex flex-wrap gap-4 text-sm">
          {isStaff(ctx.user.roles) && (
            <>
              <Link href="/app/admin/exams" className="text-cyan-300 underline">
                Gestão de simulados
              </Link>
              <Link href="/app/admin/rankings" className="text-cyan-300 underline">
                Rankings
              </Link>
              <Link href="/app/admin/performance" className="text-cyan-300 underline">
                Desempenho
              </Link>
            </>
          )}
          <Link href="/app/history" className="text-cyan-300 underline">
            Ver histórico
          </Link>
        </div>
      }
    />
  );
  if (!ctx.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Nenhuma escola vinculada"
          description="Você precisa estar vinculado a uma escola para acessar simulados."
        />
      </div>
    );
  }
  const scoped = { ...ctx, schoolId: ctx.schoolId };
  const [exams, history] = await Promise.all([fetchExams(scoped), fetchHistory(scoped)]);
  if (!exams.data) throw new Error(messageForError(exams.errorCode));
  if (!history.data) throw new Error(messageForError(history.errorCode));
  const attempts = sortByRecent(history.data.items);

  return (
    <div className="flex flex-col gap-6">
      {header}
      {exams.data.items.length === 0 ? (
        <EmptyState
          title="Nenhum simulado disponível"
          description="Quando seu professor publicar um simulado, ele aparecerá aqui."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.data.items.map((exam) => {
            const own = attempts.filter((a) => a.examId === exam.examId);
            const active = own.find((a) => a.status === 'IN_PROGRESS');
            const last = own.find((a) => a.status !== 'IN_PROGRESS');
            const progress: ExamProgress = active
              ? 'IN_PROGRESS'
              : last
                ? 'COMPLETED'
                : 'NOT_STARTED';
            return (
              <li key={exam.examId}>
                <ExamCard
                  exam={{ ...exam, questionCount: exam.questions.length }}
                  progress={progress}
                  attemptId={(active ?? last)?.attemptId ?? null}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
