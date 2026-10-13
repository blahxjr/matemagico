'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Dialog } from '@matemagico/ui';
import type { Attempt } from '../lib/exam-types';
import { answeredMap } from '../lib/format';
import { GENERIC_ERROR } from '../lib/errors';
import { QuestionNavigator } from './QuestionNavigator';
import { QuestionProgress } from './QuestionProgress';
import { QuestionTimer } from './QuestionTimer';
import { QuestionViewer } from './QuestionViewer';

type Pending = Record<string, string>;
type SendOutcome = 'saved' | 'retry' | 'rejected';

const pendingKey = (attemptId: string) => `mm_pending_${attemptId}`;

function loadPending(attemptId: string): Pending {
  try {
    return JSON.parse(window.sessionStorage.getItem(pendingKey(attemptId)) ?? '{}') as Pending;
  } catch {
    return {};
  }
}

function storePending(attemptId: string, pending: Pending) {
  try {
    if (Object.keys(pending).length === 0) window.sessionStorage.removeItem(pendingKey(attemptId));
    else window.sessionStorage.setItem(pendingKey(attemptId), JSON.stringify(pending));
  } catch {
    // Storage may be unavailable (private mode); in-memory retry still works.
  }
}

async function sendAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string,
): Promise<SendOutcome> {
  try {
    const response = await fetch(`/api/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, selectedOption }),
    });
    if (response.ok) return 'saved';
    return response.status >= 500 || response.status === 429 ? 'retry' : 'rejected';
  } catch {
    return 'retry';
  }
}

export function ExamRunner({ attempt }: { attempt: Attempt }) {
  const router = useRouter();
  const attemptId = attempt.attemptId;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => answeredMap(attempt));
  const [pendingCount, setPendingCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = useRef<Pending>({});
  const flushing = useRef(false);
  const done = useRef(false);

  const syncPending = useCallback(() => {
    storePending(attemptId, pending.current);
    setPendingCount(Object.keys(pending.current).length);
  }, [attemptId]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const [questionId, option] of Object.entries(pending.current)) {
        const outcome = await sendAnswer(attemptId, questionId, option);
        if (outcome === 'retry') break;
        if (pending.current[questionId] === option) delete pending.current[questionId];
        if (outcome === 'rejected') {
          setNotice('Uma resposta não pôde ser salva porque a tentativa não está mais ativa.');
        }
      }
    } finally {
      flushing.current = false;
      syncPending();
    }
  }, [attemptId, syncPending]);

  useEffect(() => {
    const restored = loadPending(attemptId);
    if (Object.keys(restored).length === 0) return;
    pending.current = restored;
    // sessionStorage is only readable after hydration, so restoring must happen in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers((current) => ({ ...current, ...restored }));
    syncPending();
    void flush();
  }, [attemptId, flush, syncPending]);

  useEffect(() => {
    if (pendingCount === 0) return;
    const retry = () => void flush();
    const id = setInterval(retry, 5000);
    window.addEventListener('online', retry);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', retry);
    };
  }, [pendingCount, flush]);

  const select = (questionId: string, option: string) => {
    setAnswers((current) => ({ ...current, [questionId]: option }));
    pending.current[questionId] = option;
    syncPending();
    void flush();
  };

  const finish = useCallback(
    async (force: boolean) => {
      if (done.current) return;
      setFinishing(true);
      setConfirmOpen(false);
      for (let attemptNo = 0; attemptNo < 5; attemptNo += 1) {
        // flush() is a no-op while another flush is running, so wait for it and retry.
        while (flushing.current) await new Promise((resolve) => setTimeout(resolve, 50));
        await flush();
        if (Object.keys(pending.current).length === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!force && Object.keys(pending.current).length > 0) {
        setNotice(
          'Não foi possível salvar todas as respostas. Verifique sua conexão e tente novamente.',
        );
        setFinishing(false);
        return;
      }
      try {
        const response = await fetch(`/api/attempts/${attemptId}/finish`, { method: 'POST' });
        // 409 means the attempt was already finished (e.g. expired in another tab): result is available.
        if (response.ok || response.status === 409) {
          done.current = true;
          storePending(attemptId, {});
          router.replace(`/app/attempts/${attemptId}`);
          router.refresh();
          return;
        }
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setNotice(body?.error?.message ?? GENERIC_ERROR);
      } catch {
        setNotice('Sem conexão. Tente finalizar novamente.');
      }
      setFinishing(false);
    },
    [attemptId, flush, router],
  );

  const total = attempt.questions.length;
  const question = attempt.questions[index];
  const answeredFlags = attempt.questions.map((item) => answers[item.questionId] !== undefined);
  const answeredCount = answeredFlags.filter(Boolean).length;
  const unanswered = total - answeredCount;

  if (!question) return <Alert tone="warning" title="Este simulado não possui questões." />;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h1 className="text-2xl font-bold text-slate-50">{attempt.title}</h1>
        {notice && <Alert tone="error" title={notice} />}
        {pendingCount > 0 && (
          <Alert tone="warning" title="Reenviando respostas…">
            {pendingCount} resposta(s) ainda não salvas. Elas serão reenviadas automaticamente.
          </Alert>
        )}
        <QuestionViewer
          question={question}
          number={index + 1}
          total={total}
          selected={answers[question.questionId] ?? null}
          onSelect={(option) => select(question.questionId, option)}
        />
      </div>
      <aside
        aria-label="Painel do simulado"
        className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 lg:sticky lg:top-4 lg:w-72"
      >
        <QuestionTimer expiresAt={attempt.expiresAt} onExpire={() => void finish(true)} />
        <QuestionProgress answered={answeredCount} total={total} />
        <QuestionNavigator
          total={total}
          current={index}
          answered={answeredFlags}
          onGo={(next) => setIndex(Math.min(Math.max(next, 0), total - 1))}
        />
        <Button onClick={() => setConfirmOpen(true)} loading={finishing}>
          Finalizar
        </Button>
      </aside>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Finalizar simulado?"
        description={
          unanswered > 0
            ? `Você ainda tem ${unanswered} questão(ões) sem resposta. Após finalizar não será possível alterar as respostas.`
            : 'Após finalizar não será possível alterar as respostas.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Continuar respondendo
            </Button>
            <Button onClick={() => void finish(false)}>Confirmar e finalizar</Button>
          </>
        }
      />
    </div>
  );
}
