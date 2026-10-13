import Link from 'next/link';
import { Alert, Card, EmptyState, PageHeader } from '@matemagico/ui';
import { ExamRunner } from '../../../../components/ExamRunner';
import { StartExamButton } from '../../../../components/StartExamButton';
import { messageForError } from '../../../../lib/errors';
import { levelLabel } from '../../../../lib/format';
import { fetchExams, fetchHistory, requireContext } from '../../../../lib/student-data';

export const metadata = { title: 'Simulado | MateMágico Champions' };

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const ctx = await requireContext();
  if (!ctx.schoolId) {
    return <EmptyState title="Nenhuma escola vinculada" />;
  }
  const scoped = { ...ctx, schoolId: ctx.schoolId };
  const history = await fetchHistory(scoped, examId);
  if (!history.data) throw new Error(messageForError(history.errorCode));

  const active = history.data.items.find((attempt) => attempt.status === 'IN_PROGRESS');
  if (active) return <ExamRunner attempt={active} />;

  const exams = await fetchExams(scoped);
  if (!exams.data) throw new Error(messageForError(exams.errorCode));
  const exam = exams.data.items.find((item) => item.examId === examId);
  if (!exam) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title="Simulado não encontrado ou indisponível." />
        <Link href="/app/exams" className="text-cyan-300 underline">
          Voltar para simulados
        </Link>
      </div>
    );
  }
  const last = history.data.items
    .filter((attempt) => attempt.status !== 'IN_PROGRESS')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={exam.title} description={exam.description ?? undefined} />
      <Card aria-label="Informações do simulado" className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Nível</dt>
            <dd className="text-slate-100">{levelLabel(exam.level)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Questões</dt>
            <dd className="text-slate-100">{exam.questions.length}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Duração</dt>
            <dd className="text-slate-100">{exam.durationMinutes} min</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-300">
          O tempo começa a contar assim que você iniciar. Suas respostas são salvas automaticamente.
        </p>
        <StartExamButton examId={exam.examId} />
        {last && (
          <Link
            href={`/app/attempts/${last.attemptId}`}
            className="text-sm text-cyan-300 underline"
          >
            Ver resultado da última tentativa
          </Link>
        )}
      </Card>
    </div>
  );
}
