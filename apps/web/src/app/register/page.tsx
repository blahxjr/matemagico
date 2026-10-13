import Link from 'next/link';
import { AuthShell } from '../../components/AuthShell';
import { RegisterForm } from '../../components/RegisterForm';

export const metadata = { title: 'Criar conta | MateMágico Champions' };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="text-cyan-300 underline">
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
