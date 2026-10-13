import Link from 'next/link';
import { Alert, EmptyState, PageHeader } from '@matemagico/ui';
import { AttemptStats } from '../../../../components/AttemptStats';
import { AttemptSummary } from '../../../../components/AttemptSummary';
import { QuestionViewer } from '../../../../components/QuestionViewer';
import { messageForError } from '../../../../lib/errors';
import { answeredMap, difficultyLabel, levelBreakdown, levelLabel } from '../../../../lib/format';
import { fetchAttempt, fetchTopicNames, requireContext } from '../../../../lib/student-data';

export const metadata = { title: 'Resultado | MateMágico Champions' };

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const ctx = await requireContext();
  if (!ctx.schoolId) return <EmptyState title="Nenhuma escola vinculada" />;
  const scoped = { ...ctx, schoolId: ctx.schoolId };

  const [result, topics] = await Promise.all([
    fetchAttempt(scoped, attemptId),
    fetchTopicNames(scoped),
  ]);

  // Another student's attempt is never disclosed: not found and foreign both surface as 403.
  if (result.status === 404 || result.status === 403) {
    return (
      <div className="flex flex-col gap-4" data-testid="forbidden">
        <Alert tone="error" title="Acesso negado (403)">
          Você só pode visualizar as suas próprias tentativas.
        </Alert>
        <Link href="/app/history" className="text-cyan-300 underline">
          Voltar ao histórico
        </Link>
      </div>
    );
  }
  if (!result.data) throw new Error(messageForError(result.errorCode));
  const attempt = result.data;

  if (attempt.status === 'IN_PROGRESS') {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info" title="Esta tentativa ainda está em andamento." />
        <Link href={`/app/exams/${attempt.examId}`} className="text-cyan-300 underline">
          Continuar simulado
        </Link>
      </div>
    );
  }

  const answers = answeredMap(attempt);
  const results = attempt.result;
  const topicLabel = (key: string) => topics[key] ?? key;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resultado"
        actions={
          <>
            <Link href="/app/history" className="text-sm text-cyan-300 underline">
              Histórico
            </Link>
            <Link href="/app/exams" className="text-sm text-cyan-300 underline">
              Simulados
            </Link>
          </>
        }
      />
      <AttemptSummary attempt={attempt} />
      {results && (
        <AttemptStats
          topics={results.topicResults}
          difficulties={results.difficultyResults}
          gradeLevels={results.gradeLevelResults}
          levels={levelBreakdown(attempt.questions, answers)}
          topicLabel={topicLabel}
          difficultyLabel={difficultyLabel}
          levelLabel={levelLabel}
        />
      )}
      <section aria-label="Revisão das questões" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-slate-50">Revisão</h2>
        {attempt.questions.map((question, index) => (
          <QuestionViewer
            key={question.questionId}
            question={question}
            number={index + 1}
            total={attempt.questions.length}
            selected={answers[question.questionId] ?? null}
            review
            topicName={question.topicId ? topicLabel(question.topicId) : undefined}
          />
        ))}
      </section>
    </div>
  );
}
