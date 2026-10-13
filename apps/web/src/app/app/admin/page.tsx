import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@matemagico/ui';
import { canAccess } from '../../../lib/navigation';
import { getSessionUser } from '../../../lib/session';

export const metadata = { title: 'Administração | MateMágico Champions' };

const AREAS = [
  { href: '/app/admin/students', title: 'Alunos', text: 'Ativar vínculos e conceder papéis.' },
  { href: '/app/admin/exams', title: 'Simulados', text: 'Criar rascunhos e publicar.' },
  {
    href: '/app/admin/rankings',
    title: 'Rankings',
    text: 'Classificação da escola e por simulado.',
  },
  { href: '/app/admin/performance', title: 'Desempenho', text: 'Médias por aluno e por tema.' },
];

export default async function AdminPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  if (!canAccess(user.roles, '/app/admin')) redirect('/app/dashboard');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Administração" description="Gestão da escola." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {AREAS.map((area) => (
          <li key={area.href}>
            <Card className="h-full">
              <h2 className="text-lg font-semibold text-slate-50">
                <Link
                  href={area.href}
                  className="underline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {area.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-300">{area.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
