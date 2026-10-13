'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input, Select, Textarea } from '@matemagico/ui';
import { createExamSchema, fieldErrors, QUESTION_LEVELS } from '@matemagico/validation';
import { callBff } from '../lib/bff-client';
import { LEVEL_LABELS } from '../lib/format';

export function CreateExamForm({
  topics,
}: {
  topics: readonly { topicId: string; name: string }[];
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const until = text('availableUntil');
    const parsed = createExamSchema.safeParse({
      title: text('title'),
      description: text('description') || undefined,
      level: text('level'),
      topicId: text('topicId'),
      quantity: Number(text('quantity')),
      durationMinutes: Number(text('durationMinutes')),
      availableUntil: until ? new Date(until).toISOString() : undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setMessage(null);
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await callBff('/api/exams', 'POST', parsed.data);
    setLoading(false);
    if (!result.ok) return setMessage({ tone: 'error', text: result.message });
    setMessage({ tone: 'success', text: 'Simulado criado como rascunho.' });
    target.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Novo simulado"
      className="grid gap-4 sm:grid-cols-2"
    >
      {message && (
        <div className="sm:col-span-2">
          <Alert tone={message.tone} title={message.text} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Input name="title" label="Título" error={errors.title} required />
      </div>
      <div className="sm:col-span-2">
        <Textarea name="description" label="Descrição" error={errors.description} />
      </div>
      <Select
        name="level"
        label="Nível"
        error={errors.level}
        options={QUESTION_LEVELS.map((level) => ({
          value: level,
          label: LEVEL_LABELS[level] ?? level,
        }))}
        defaultValue="OBMEP_N1"
      />
      <Select
        name="topicId"
        label="Tema"
        error={errors.topicId}
        options={topics.map((topic) => ({ value: topic.topicId, label: topic.name }))}
      />
      <Input
        name="quantity"
        type="number"
        min={1}
        max={100}
        defaultValue={5}
        label="Quantidade de questões"
        error={errors.quantity}
      />
      <Input
        name="durationMinutes"
        type="number"
        min={1}
        defaultValue={30}
        label="Duração (minutos)"
        error={errors.durationMinutes}
      />
      <div className="sm:col-span-2">
        <Input
          name="availableUntil"
          type="datetime-local"
          label="Disponível até"
          hint="Opcional."
          error={errors.availableUntil}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={loading}>
          Criar simulado
        </Button>
      </div>
    </form>
  );
}
