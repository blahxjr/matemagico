import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '../../components/AuthShell';
import { LoginForm } from '../../components/LoginForm';
import { safeNext } from '../../lib/auth-guard';
import { getSessionToken } from '../../lib/session';

export const metadata = { title: 'Entrar | MateMágico Champions' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const params = await searchParams;
  if (await getSessionToken()) redirect(safeNext(params.next));
  return (
    <AuthShell
      title="Entrar"
      footer={
        <>
          Não tem conta?{' '}
          <Link href="/register" className="text-cyan-300 underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(params.next)} registered={params.registered === '1'} />
    </AuthShell>
  );
}
