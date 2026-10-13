'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input, Textarea } from '@matemagico/ui';
import { fieldErrors, updateExamSchema } from '@matemagico/validation';
import { callBff } from '../lib/bff-client';
import type { ExamSummary } from '../lib/exam-types';

function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function asIsoOrInvalid(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function EditExamForm({ exam }: { exam: ExamSummary }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const parsed = updateExamSchema.safeParse({
      title: text('title'),
      description: text('description') || null,
      durationMinutes: Number(text('durationMinutes')),
      availableFrom: asIsoOrInvalid(text('availableFrom')),
      availableUntil: asIsoOrInvalid(text('availableUntil')),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setError(null);
      return;
    }
    setErrors({});
    setError(null);
    setLoading(true);
    const result = await callBff(
      `/api/exams/${encodeURIComponent(exam.examId)}`,
      'PATCH',
      parsed.data,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        aria-expanded={editing}
        aria-controls={`edit-exam-${exam.examId}`}
        aria-label={`Editar ${exam.title}`}
        onClick={() => setEditing((value) => !value)}
      >
        {editing ? 'Cancelar edição' : 'Editar'}
      </Button>
      {editing && (
        <form
          id={`edit-exam-${exam.examId}`}
          onSubmit={submit}
          noValidate
          aria-label={`Editar ${exam.title}`}
          className="grid min-w-64 gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3"
        >
          {error && <Alert tone="error" title={error} />}
          <Input
            name="title"
            label={`Título do simulado ${exam.title}`}
            defaultValue={exam.title}
            error={errors.title}
            required
          />
          <Textarea
            name="description"
            label={`Descrição do simulado ${exam.title}`}
            defaultValue={exam.description ?? ''}
            error={errors.description}
          />
          <Input
            name="durationMinutes"
            type="number"
            min={1}
            label={`Duração do simulado ${exam.title} em minutos`}
            defaultValue={exam.durationMinutes}
            error={errors.durationMinutes}
            required
          />
          <Input
            name="availableFrom"
            type="datetime-local"
            label={`Disponível a partir de ${exam.title}`}
            defaultValue={localDateTime(exam.availableFrom)}
            error={errors.availableFrom}
          />
          <Input
            name="availableUntil"
            type="datetime-local"
            label={`Disponível até ${exam.title}`}
            defaultValue={localDateTime(exam.availableUntil)}
            error={errors.availableUntil}
          />
          <Button type="submit" loading={loading} aria-label={`Salvar alterações de ${exam.title}`}>
            Salvar alterações
          </Button>
        </form>
      )}
    </div>
  );
}
