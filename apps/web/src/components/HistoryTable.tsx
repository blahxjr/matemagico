import Link from 'next/link';
import type { Attempt } from '../lib/exam-types';
import { formatClock, formatDateTime, formatPercent, timeSpentSeconds } from '../lib/format';

/** Rows are rendered in the order received; callers pass most-recent-first. */
export function HistoryTable({ attempts }: { attempts: readonly Attempt[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">Histórico de tentativas</caption>
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th scope="col" className="p-3 font-medium">
              Simulado
            </th>
            <th scope="col" className="p-3 font-medium">
              Data
            </th>
            <th scope="col" className="p-3 font-medium">
              Nota
            </th>
            <th scope="col" className="p-3 font-medium">
              Percentual
            </th>
            <th scope="col" className="p-3 font-medium">
              Tempo gasto
            </th>
            <th scope="col" className="p-3 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const finished = attempt.status !== 'IN_PROGRESS' && attempt.result;
            return (
              <tr key={attempt.attemptId} className="border-t border-slate-800 text-slate-100">
                <th scope="row" className="p-3 font-medium">
                  {attempt.title}
                </th>
                <td className="p-3">{formatDateTime(attempt.startedAt)}</td>
                <td className="p-3">{finished ? formatPercent(attempt.result!.score) : '—'}</td>
                <td className="p-3">
                  {finished ? formatPercent(attempt.result!.percentage) : '—'}
                </td>
                <td className="p-3">
                  {finished ? formatClock(timeSpentSeconds(attempt)) : 'Em andamento'}
                </td>
                <td className="p-3">
                  <Link
                    href={
                      finished
                        ? `/app/attempts/${attempt.attemptId}`
                        : `/app/exams/${attempt.examId}`
                    }
                    className="text-cyan-300 underline focus-visible:outline-2 focus-visible:outline-cyan-400"
                    aria-label={`${finished ? 'Ver resultado' : 'Continuar'}: ${attempt.title}`}
                  >
                    {finished ? 'Ver resultado' : 'Continuar'}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
