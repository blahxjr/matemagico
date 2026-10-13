import Link from 'next/link';
import { Badge, Card } from '@matemagico/ui';
import type { ExamSummary } from '../lib/exam-types';
import { formatDateTime, levelLabel } from '../lib/format';

export type ExamProgress = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS: Record<ExamProgress, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
  NOT_STARTED: { label: 'Não iniciado', tone: 'neutral' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'warning' },
  COMPLETED: { label: 'Concluído', tone: 'success' },
};

const linkClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400';

export interface ExamCardProps {
  exam: Pick<
    ExamSummary,
    'examId' | 'title' | 'description' | 'level' | 'durationMinutes' | 'availableUntil'
  > & { questionCount: number };
  progress: ExamProgress;
  /** Attempt to continue or to show the result for. */
  attemptId?: string | null;
}

export function ExamCard({ exam, progress, attemptId }: ExamCardProps) {
  const status = STATUS[progress];
  return (
    <Card aria-label={`Simulado ${exam.title}`} className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-50">{exam.title}</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {exam.description && <p className="text-sm text-slate-300">{exam.description}</p>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-slate-400">Nível</dt>
          <dd className="text-slate-100">{levelLabel(exam.level)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Questões</dt>
          <dd className="text-slate-100">{exam.questionCount}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Duração</dt>
          <dd className="text-slate-100">{exam.durationMinutes} min</dd>
        </div>
        <div>
          <dt className="text-slate-400">Disponível até</dt>
          <dd className="text-slate-100">
            {exam.availableUntil ? formatDateTime(exam.availableUntil) : 'Sem limite'}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        {progress === 'IN_PROGRESS' && (
          <Link
            href={`/app/exams/${exam.examId}`}
            className={`${linkClass} bg-cyan-500 text-slate-950 hover:bg-cyan-400`}
          >
            Continuar
          </Link>
        )}
        {progress === 'COMPLETED' && attemptId && (
          <Link
            href={`/app/attempts/${attemptId}`}
            className={`${linkClass} bg-cyan-500 text-slate-950 hover:bg-cyan-400`}
          >
            Visualizar Resultado
          </Link>
        )}
        {progress !== 'IN_PROGRESS' && (
          <Link
            href={`/app/exams/${exam.examId}`}
            className={`${linkClass} border border-slate-600 text-slate-100 hover:bg-slate-800`}
          >
            {progress === 'COMPLETED' ? 'Nova tentativa' : 'Iniciar'}
          </Link>
        )}
      </div>
    </Card>
  );
}
