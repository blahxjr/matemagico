import Link from 'next/link';
import { EmptyState, PageHeader } from '@matemagico/ui';
import { RankingTable } from '../../../../components/RankingTable';
import {
  fetchAdminExams,
  fetchExamRanking,
  fetchMembers,
  fetchSchoolRanking,
} from '../../../../lib/admin-data';
import { nameResolver, requireStaffContext } from '../../../../lib/admin-guard';
import { messageForError } from '../../../../lib/errors';

export const metadata = { title: 'Rankings | MateMágico Champions' };

export default async function AdminRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const { examId } = await searchParams;
  const ctx = await requireStaffContext('/app/admin/rankings');
  const header = (
    <PageHeader
      title="Rankings"
      description="Classificação dos alunos por nota, acertos e tempo."
    />
  );
  if (!ctx.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState title="Nenhuma escola vinculada" description="Vincule-se a uma escola." />
      </div>
    );
  }
  const scoped = { ...ctx, schoolId: ctx.schoolId };
  const [school, exam, members, exams] = await Promise.all([
    fetchSchoolRanking(scoped),
    examId ? fetchExamRanking(scoped, examId) : Promise.resolve(null),
    ctx.user.roles.includes('SCHOOL_ADMIN') ? fetchMembers(scoped) : Promise.resolve(null),
    fetchAdminExams(scoped),
  ]);
  if (!school.data) throw new Error(messageForError(school.errorCode));
  if (exam && !exam.data) throw new Error(messageForError(exam.errorCode));
  if (members && !members.data) throw new Error(messageForError(members.errorCode));
  if (!exams.data) throw new Error(messageForError(exams.errorCode));
  const nameOf = nameResolver(
    members?.data?.items.map((m) => ({ id: m.userId, name: m.name })) ?? [],
    'Aluno',
  );
  const published = exams.data.items.filter((item) => item.status === 'PUBLISHED');
  const selected = published.find((item) => item.examId === examId);

  return (
    <div className="flex flex-col gap-8">
      {header}
      <section aria-labelledby="ranking-escola" className="flex flex-col gap-3">
        <h2 id="ranking-escola" className="text-xl font-semibold">
          Ranking da escola
        </h2>
        {school.data.items.length === 0 ? (
          <EmptyState
            title="Sem resultados ainda"
            description="O ranking aparece quando os alunos concluírem simulados."
          />
        ) : (
          <RankingTable
            rows={school.data.items}
            nameOf={nameOf}
            caption="Ranking da escola"
            showAttempts
          />
        )}
      </section>
      <section aria-labelledby="ranking-simulado" className="flex flex-col gap-3">
        <h2 id="ranking-simulado" className="text-xl font-semibold">
          Ranking por simulado
        </h2>
        {published.length === 0 ? (
          <EmptyState title="Nenhum simulado publicado" description="Publique um simulado." />
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Simulados publicados">
            {published.map((item) => (
              <li key={item.examId}>
                <Link
                  href={`/app/admin/rankings?examId=${item.examId}`}
                  aria-current={item.examId === examId ? 'true' : undefined}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-600 px-3 py-2 text-sm text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400 aria-[current=true]:bg-slate-800"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {exam?.data &&
          (exam.data.items.length === 0 ? (
            <EmptyState
              title="Sem resultados neste simulado"
              description="Nenhum aluno concluiu este simulado."
            />
          ) : (
            <RankingTable
              rows={exam.data.items}
              nameOf={nameOf}
              caption={`Ranking do simulado ${selected?.title ?? ''}`}
            />
          ))}
      </section>
    </div>
  );
}
