'use client';

import { ChangeEvent, FormEvent, useState } from 'react';

type Exam = { examId: string; title: string; description: string | null; durationMinutes: number };
type Attempt = {
  attemptId: string;
  title: string;
  status: string;
  questions: {
    questionId: string;
    position: number;
    title: string;
    statement: string;
    options: { label: string; content: string }[];
  }[];
  result: {
    score: number;
    percentage: number;
    correctAnswers: number;
    totalQuestions: number;
  } | null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const request = async <T,>(path: string, init: RequestInit = {}) => {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      throw new Error(body?.error?.code ?? 'Não foi possível concluir a operação.');
    }
    return response.json() as Promise<T>;
  };
  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const session = await request<{ sessionId: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(session.sessionId);
      const profile = (await fetch(`${apiUrl}/auth/me`, {
        headers: { authorization: `Bearer ${session.sessionId}` },
      }).then((r) => r.json())) as { schools: { schoolId: string }[] };
      setSchoolId(profile.schools[0]?.schoolId ?? '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no login.');
    }
  };
  const valueOf = (event: ChangeEvent<HTMLInputElement>) =>
    (event.target as unknown as { value: string }).value;
  const changeEmail = (event: ChangeEvent<HTMLInputElement>) => setEmail(valueOf(event));
  const changePassword = (event: ChangeEvent<HTMLInputElement>) => setPassword(valueOf(event));
  const changeSchool = (event: ChangeEvent<HTMLInputElement>) => setSchoolId(valueOf(event));
  const loadExams = async () => {
    try {
      setError('');
      setExams(
        (await request<{ items: Exam[] }>(`/exams?schoolId=${encodeURIComponent(schoolId)}`)).items,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar simulados.');
    }
  };
  const start = async (examId: string) => {
    try {
      setError('');
      setAnswers({});
      setAttempt(
        await request<Attempt>(`/exams/${examId}/attempts`, {
          method: 'POST',
          body: JSON.stringify({ schoolId }),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao iniciar.');
    }
  };
  const finish = async () => {
    if (!attempt) return;
    try {
      for (const [questionId, selectedOption] of Object.entries(answers))
        await request(`/attempts/${attempt.attemptId}/answers`, {
          method: 'POST',
          body: JSON.stringify({ schoolId, questionId, selectedOption }),
        });
      setAttempt(
        await request<Attempt>(`/attempts/${attempt.attemptId}/finish`, {
          method: 'POST',
          body: JSON.stringify({ schoolId }),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao finalizar.');
    }
  };
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[.25em] text-cyan-300">
            MateMágico
          </p>
          <h1 className="text-4xl font-bold">MateMágico Champions</h1>
        </header>
        {error && (
          <p role="alert" className="rounded bg-rose-950 p-3 text-rose-200">
            {error}
          </p>
        )}
        {!token ? (
          <form onSubmit={login} className="space-y-4 rounded-xl bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Entrar</h2>
            <label className="block">
              E-mail
              <input
                aria-label="E-mail"
                className="mt-1 w-full rounded bg-slate-800 p-2"
                type="email"
                value={email}
                onChange={changeEmail}
                required
              />
            </label>
            <label className="block">
              Palavra-passe
              <input
                aria-label="Palavra-passe"
                className="mt-1 w-full rounded bg-slate-800 p-2"
                type="password"
                value={password}
                onChange={changePassword}
                required
              />
            </label>
            <button className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
              Entrar
            </button>
          </form>
        ) : !attempt ? (
          <section className="space-y-4 rounded-xl bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Simulados disponíveis</h2>
            <label className="block">
              Escola
              <input
                aria-label="Escola"
                className="mt-1 w-full rounded bg-slate-800 p-2"
                value={schoolId}
                onChange={changeSchool}
              />
            </label>
            <button
              onClick={loadExams}
              className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950"
            >
              Carregar simulados
            </button>
            <div className="space-y-3">
              {exams.map((exam) => (
                <article key={exam.examId} className="rounded border border-slate-700 p-4">
                  <h3 className="font-semibold">{exam.title}</h3>
                  <p className="text-sm text-slate-300">
                    {exam.durationMinutes} minutos · {exam.description}
                  </p>
                  <button
                    onClick={() => start(exam.examId)}
                    className="mt-3 rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-950"
                  >
                    Iniciar simulado
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : attempt.result ? (
          <section className="rounded-xl bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Resultado: {attempt.title}</h2>
            <p className="mt-4 text-4xl font-bold text-emerald-300">{attempt.result.score}%</p>
            <p>
              {attempt.result.correctAnswers} de {attempt.result.totalQuestions} respostas
              correctas.
            </p>
            <button
              onClick={() => {
                setAttempt(null);
                setExams([]);
              }}
              className="mt-5 rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950"
            >
              Ver simulados
            </button>
          </section>
        ) : (
          <section className="space-y-5 rounded-xl bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">{attempt.title}</h2>
            {attempt.questions.map((question) => (
              <fieldset key={question.questionId} className="rounded border border-slate-700 p-4">
                <legend className="font-semibold">
                  {question.position}. {question.title}
                </legend>
                <p className="my-3">{question.statement}</p>
                {question.options.map((option) => (
                  <label key={option.label} className="mb-2 flex gap-2">
                    <input
                      type="radio"
                      name={question.questionId}
                      value={option.label}
                      checked={answers[question.questionId] === option.label}
                      onChange={() =>
                        setAnswers({ ...answers, [question.questionId]: option.label })
                      }
                    />
                    {option.label}. {option.content}
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              onClick={finish}
              className="rounded bg-emerald-400 px-4 py-2 font-semibold text-slate-950"
            >
              Finalizar simulado
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
