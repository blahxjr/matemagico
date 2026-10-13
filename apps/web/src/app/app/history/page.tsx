import Link from 'next/link';
import { EmptyState, PageHeader } from '@matemagico/ui';
import { HistoryTable } from '../../../components/HistoryTable';
import { messageForError } from '../../../lib/errors';
import { fetchHistory, requireContext, sortByRecent } from '../../../lib/student-data';

export const metadata = { title: 'Histórico | MateMágico Champions' };

export default async function HistoryPage() {
  const ctx = await requireContext();
  const header = (
    <PageHeader
      title="Histórico"
      description="Suas tentativas, da mais recente para a mais antiga."
      actions={
        <Link href="/app/exams" className="text-sm text-cyan-300 underline">
          Simulados
        </Link>
      }
    />
  );
  if (!ctx.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState title="Nenhuma escola vinculada" />
      </div>
    );
  }
  const history = await fetchHistory({ ...ctx, schoolId: ctx.schoolId });
  if (!history.data) throw new Error(messageForError(history.errorCode));
  const attempts = sortByRecent(history.data.items);

  return (
    <div className="flex flex-col gap-6">
      {header}
      {attempts.length === 0 ? (
        <EmptyState
          title="Nenhuma tentativa ainda"
          description="Quando você concluir um simulado, ele aparecerá aqui."
          action={
            <Link href="/app/exams" className="text-cyan-300 underline">
              Ver simulados
            </Link>
          }
        />
      ) : (
        <HistoryTable attempts={attempts} />
      )}
    </div>
  );
}
