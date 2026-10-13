import Link from 'next/link';
import { Badge } from '@matemagico/ui';
import type { ExamSummary } from '../lib/exam-types';
import { formatDateTime } from '../lib/format';
import { EditExamForm } from './EditExamForm';
import { PublishExamButton } from './PublishExamButton';

const STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Rascunho', tone: 'warning' },
  PUBLISHED: { label: 'Publicado', tone: 'success' },
  ARCHIVED: { label: 'Arquivado', tone: 'neutral' },
};

export function ExamManagementTable({ exams }: { exams: readonly ExamSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Simulados da escola</caption>
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            {['Título', 'Status', 'Questões', 'Data de publicação', 'Expiração', 'Ações'].map(
              (heading) => (
                <th key={heading} scope="col" className="p-3 font-medium">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => {
            const status = STATUS[exam.status] ?? { label: exam.status, tone: 'neutral' as const };
            return (
              <tr key={exam.examId} className="border-t border-slate-800 text-slate-100">
                <th scope="row" className="p-3 font-medium">
                  {exam.title}
                </th>
                <td className="p-3">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="p-3">{exam.questions.length}</td>
                <td className="p-3">{formatDateTime(exam.publishedAt)}</td>
                <td className="p-3">{formatDateTime(exam.availableUntil)}</td>
                <td className="p-3">
                  {exam.status === 'DRAFT' ? (
                    <div className="flex flex-col items-start gap-2">
                      <EditExamForm exam={exam} />
                      <PublishExamButton examId={exam.examId} title={exam.title} />
                    </div>
                  ) : exam.status === 'PUBLISHED' ? (
                    <Link
                      href={`/app/admin/rankings?examId=${exam.examId}`}
                      className="text-cyan-300 underline focus-visible:outline-2 focus-visible:outline-cyan-400"
                      aria-label={`Ver ranking: ${exam.title}`}
                    >
                      Ver ranking
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
