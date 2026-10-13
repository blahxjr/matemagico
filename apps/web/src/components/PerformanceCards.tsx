import { Card } from '@matemagico/ui';
import { formatPercent } from '../lib/format';
import type { StudentPerformanceRow, TopicPerformanceRow } from '../lib/admin-data';

export function PerformanceCards({
  students,
  topics,
  studentName,
  topicName,
}: {
  students: readonly StudentPerformanceRow[];
  topics: readonly TopicPerformanceRow[];
  studentName: (studentId: string) => string;
  topicName: (topicId: string) => string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card aria-labelledby="perf-students">
        <h2 id="perf-students" className="mb-3 text-lg font-semibold text-slate-50">
          Desempenho por aluno
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="sr-only">Desempenho por aluno</caption>
            <thead className="text-slate-400">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Nome
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Média
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Última nota
                </th>
                <th scope="col" className="py-2 font-medium">
                  Tentativas
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-800 text-slate-100">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {studentName(row.studentId)}
                  </th>
                  <td className="py-2 pr-3">{formatPercent(row.averageScore)}</td>
                  <td className="py-2 pr-3">{formatPercent(row.lastScore)}</td>
                  <td className="py-2">{row.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card aria-labelledby="perf-topics">
        <h2 id="perf-topics" className="mb-3 text-lg font-semibold text-slate-50">
          Desempenho por tema
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="sr-only">Desempenho por tema</caption>
            <thead className="text-slate-400">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Tema
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Acertos
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Erros
                </th>
                <th scope="col" className="py-2 font-medium">
                  Percentual
                </th>
              </tr>
            </thead>
            <tbody>
              {topics.map((row) => (
                <tr key={row.topicId} className="border-t border-slate-800 text-slate-100">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {topicName(row.topicId)}
                  </th>
                  <td className="py-2 pr-3">{row.correctAnswers}</td>
                  <td className="py-2 pr-3">{row.wrongAnswers}</td>
                  <td className="py-2">{formatPercent(row.percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
