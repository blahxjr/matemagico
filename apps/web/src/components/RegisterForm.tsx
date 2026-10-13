'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input } from '@matemagico/ui';
import { registerSchema, fieldErrors } from '@matemagico/validation';
import { GENERIC_ERROR } from '../lib/errors';

export function RegisterForm() {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: data.get('name'),
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
      const response = await fetch('/api/auth/register', {
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
      router.push('/login?registered=1');
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Criar conta" className="flex flex-col gap-4">
      {formError && <Alert tone="error" title={formError} />}
      <Input label="Nome" name="name" autoComplete="name" error={fields.name} />
      <Input label="E-mail" name="email" type="email" autoComplete="email" error={fields.email} />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 12 caracteres."
        error={fields.password}
      />
      <Button type="submit" loading={loading}>
        Criar conta
      </Button>
    </form>
  );
}
