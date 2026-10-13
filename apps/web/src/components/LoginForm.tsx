'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input } from '@matemagico/ui';
import { loginSchema, fieldErrors } from '@matemagico/validation';
import { GENERIC_ERROR } from '../lib/errors';

export function LoginForm({
  next = '/app/dashboard',
  registered = false,
}: {
  next?: string;
  registered?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
    });
    if (!parsed.success) {
      setFields(fieldErrors(parsed.error));
      setFormError(null);
      return;
    }
    setFields({});
    setFormError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setFormError(body?.error?.message ?? GENERIC_ERROR);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Entrar" className="flex flex-col gap-4">
      {registered && <Alert tone="success" title="Conta criada. Faça login para continuar." />}
      {formError && <Alert tone="error" title={formError} />}
      <Input label="E-mail" name="email" type="email" autoComplete="email" error={fields.email} />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        error={fields.password}
      />
      <Button type="submit" loading={loading}>
        Entrar
      </Button>
    </form>
  );
}
