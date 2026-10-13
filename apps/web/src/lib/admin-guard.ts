import { redirect } from 'next/navigation';
import { canAccess } from './navigation';
import { requireContext } from './student-data';

/** Server-only: session required, and the role must be allowed to open `pathname`. */
export async function requireStaffContext(pathname: string) {
  const ctx = await requireContext();
  if (!canAccess(ctx.user.roles, pathname)) redirect('/app/dashboard');
  return ctx;
}

const SHORT_ID = 8;

/** Name lookup that degrades to a short id when the caller cannot list members. */
export function nameResolver(entries: readonly { id: string; name: string }[], prefix: string) {
  const map = new Map(entries.map((entry) => [entry.id, entry.name]));
  return (id: string) => map.get(id) ?? `${prefix} ${id.slice(0, SHORT_ID)}`;
}
