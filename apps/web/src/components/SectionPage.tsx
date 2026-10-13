import { redirect } from 'next/navigation';
import { EmptyState, PageHeader } from '@matemagico/ui';
import { canAccess } from '../lib/navigation';
import { getSessionUser } from '../lib/session';

/** Foundation placeholder for areas delivered in later phases; enforces role-based access. */
export async function SectionPage({
  pathname,
  title,
  description,
}: {
  pathname: string;
  title: string;
  description: string;
}) {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  if (!canAccess(user.roles, pathname)) redirect('/app/dashboard');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState title="Em breve" description="Esta área será liberada nas próximas fases." />
    </div>
  );
}
