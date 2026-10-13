'use client';

import { useState } from 'react';
import { Badge, cn } from '@matemagico/ui';
import type { ExamQuestion } from '../lib/exam-types';
import { difficultyLabel, levelLabel } from '../lib/format';

export function QuestionImage({ url, alt }: { url: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url) return null;
  if (failed) {
    return (
      <div
        role="img"
        aria-label="Imagem indisponível"
        data-testid="image-placeholder"
        className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800 text-sm text-slate-400"
      >
        Imagem indisponível
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-80 w-full rounded-lg bg-white object-contain"
    />
  );
}

export interface QuestionViewerProps {
  question: ExamQuestion;
  number: number;
  total: number;
  selected?: string | null;
  onSelect?: (label: string) => void;
  /** Review mode shows the correct option, the explanation and result indicators. */
  review?: boolean;
  topicName?: string;
}

export function QuestionViewer({
  question,
  number,
  total,
  selected = null,
  onSelect,
  review = false,
  topicName,
}: QuestionViewerProps) {
  const name = `question-${question.questionId}`;
  const correct = question.correctOption ?? null;
  const hit = review && selected !== null && selected === correct;

  return (
    <article
      aria-label={`Questão ${number} de ${total}`}
      className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-50">
          Questão {number} <span className="text-slate-400">de {total}</span>
        </h2>
        {review && (
          <Badge tone={hit ? 'success' : 'danger'}>{hit ? '✅ Acertou' : '❌ Errou'}</Badge>
        )}
        {review && topicName && <Badge tone="info">{topicName}</Badge>}
        {review && question.difficulty && (
          <Badge tone="warning">{difficultyLabel(question.difficulty)}</Badge>
        )}
        {review && question.level && <Badge>{levelLabel(question.level)}</Badge>}
      </header>
      <p className="whitespace-pre-line text-slate-100">{question.statement}</p>
      <QuestionImage url={question.imageUrl} alt={`Figura da questão ${number}`} />
      <fieldset className="flex flex-col gap-2" disabled={review}>
        <legend className="sr-only">Alternativas da questão {number}</legend>
        {question.options.map((option) => {
          const isSelected = selected === option.label;
          const isCorrect = review && correct === option.label;
          const isWrong = review && isSelected && !isCorrect;
          return (
            <label
              key={option.label}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-slate-100 focus-within:outline-2 focus-within:outline-cyan-400',
                isSelected ? 'border-cyan-400 bg-cyan-950' : 'border-slate-700 hover:bg-slate-800',
                isCorrect && 'border-emerald-500 bg-emerald-950',
                isWrong && 'border-rose-500 bg-rose-950',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.label}
                checked={isSelected}
                onChange={() => onSelect?.(option.label)}
                className="mt-1"
              />
              <span>
                <strong>{option.label})</strong> {option.content}
                {isCorrect && (
                  <span className="ml-2 text-sm text-emerald-300">Resposta correta</span>
                )}
                {isWrong && <span className="ml-2 text-sm text-rose-300">Sua resposta</span>}
              </span>
            </label>
          );
        })}
      </fieldset>
      {review && selected === null && (
        <p className="text-sm text-amber-300">Você não respondeu esta questão.</p>
      )}
      {review && question.explanation && (
        <section
          aria-label="Explicação"
          className="rounded-lg bg-slate-800 p-3 text-sm text-slate-200"
        >
          <h3 className="font-semibold">Explicação</h3>
          <p className="mt-1 whitespace-pre-line">{question.explanation}</p>
        </section>
      )}
    </article>
  );
}
