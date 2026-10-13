import { Card } from '@matemagico/ui';
import type { StatBreakdown } from '../lib/exam-types';
import { formatPercent } from '../lib/format';

function StatTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; stat: StatBreakdown }[];
}) {
  return (
    <Card aria-label={`Estatísticas por ${title.toLowerCase()}`}>
      <h3 className="mb-2 font-semibold text-slate-50">Por {title.toLowerCase()}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Desempenho por {title.toLowerCase()}</caption>
          <thead className="text-slate-400">
            <tr>
              <th scope="col" className="pb-1 pr-3 font-medium">
                {title}
              </th>
              <th scope="col" className="pb-1 pr-3 font-medium">
                Acertos
              </th>
              <th scope="col" className="pb-1 font-medium">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, stat }) => (
              <tr key={key} className="border-t border-slate-800 text-slate-100">
                <th scope="row" className="py-1 pr-3 font-normal">
                  {label}
                </th>
                <td className="py-1 pr-3">
                  {stat.correctAnswers}/{stat.totalQuestions}
                </td>
                <td className="py-1">{formatPercent(stat.percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export interface AttemptStatsProps {
  topics: Record<string, StatBreakdown>;
  difficulties: Record<string, StatBreakdown>;
  gradeLevels: Record<string, StatBreakdown>;
  levels: Record<string, StatBreakdown>;
  topicLabel: (key: string) => string;
  difficultyLabel: (key: string) => string;
  levelLabel: (key: string) => string;
}

export function AttemptStats(props: AttemptStatsProps) {
  const rows = (data: Record<string, StatBreakdown>, label: (key: string) => string) =>
    Object.entries(data).map(([key, stat]) => ({ key, label: label(key), stat }));
  return (
    <section aria-label="Estatísticas" className="grid gap-4 md:grid-cols-2">
      <StatTable title="Tópico" rows={rows(props.topics, props.topicLabel)} />
      <StatTable title="Dificuldade" rows={rows(props.difficulties, props.difficultyLabel)} />
      <StatTable title="Série" rows={rows(props.gradeLevels, props.levelLabel)} />
      <StatTable title="Nível" rows={rows(props.levels, props.levelLabel)} />
    </section>
  );
}
