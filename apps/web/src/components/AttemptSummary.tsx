import { Badge, Card } from '@matemagico/ui';
import type { Attempt } from '../lib/exam-types';
import { formatClock, formatPercent, timeSpentSeconds } from '../lib/format';

export function AttemptSummary({ attempt }: { attempt: Attempt }) {
  const result = attempt.result;
  if (!result) return null;
  return (
    <Card aria-label="Resumo do resultado" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-50">{attempt.title}</h2>
        {attempt.status === 'EXPIRED' && <Badge tone="warning">Tempo esgotado</Badge>}
      </div>
      <p className="text-5xl font-bold text-cyan-300" data-testid="score">
        <span className="sr-only">Nota: </span>
        {formatPercent(result.score)}
      </p>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-400">Acertos</dt>
          <dd className="text-lg font-semibold text-emerald-300">{result.correctAnswers}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Erros</dt>
          <dd className="text-lg font-semibold text-rose-300">{result.wrongAnswers}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Percentual</dt>
          <dd className="text-lg font-semibold text-slate-100">
            {formatPercent(result.percentage)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Tempo gasto</dt>
          <dd className="text-lg font-semibold text-slate-100">
            {formatClock(timeSpentSeconds(attempt))}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
