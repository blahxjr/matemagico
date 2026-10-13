import { formatClock, formatPercent } from '../lib/format';
import type { RankingRow } from '../lib/admin-data';

export function RankingTable({
  rows,
  nameOf,
  caption,
  showAttempts = false,
}: {
  rows: readonly RankingRow[];
  nameOf: (studentId: string) => string;
  caption: string;
  showAttempts?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th scope="col" className="p-3 font-medium">
              Posição
            </th>
            <th scope="col" className="p-3 font-medium">
              Aluno
            </th>
            <th scope="col" className="p-3 font-medium">
              Nota
            </th>
            <th scope="col" className="p-3 font-medium">
              Acertos
            </th>
            <th scope="col" className="p-3 font-medium">
              Tempo
            </th>
            {showAttempts && (
              <th scope="col" className="p-3 font-medium">
                Tentativas
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t border-slate-800 text-slate-100">
              <td className="p-3 font-semibold">{row.position}º</td>
              <th scope="row" className="p-3 font-medium">
                {nameOf(row.studentId)}
              </th>
              <td className="p-3">{formatPercent(row.score)}</td>
              <td className="p-3">{row.correctAnswers}</td>
              <td className="p-3">{formatClock(row.timeSpentSeconds)}</td>
              {showAttempts && <td className="p-3">{row.attempts}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
