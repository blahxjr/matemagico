import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { AttemptSummary } from './AttemptSummary';
import { ExamRunner } from './ExamRunner';
import { QuestionNavigator } from './QuestionNavigator';
import { QuestionTimer } from './QuestionTimer';
import { QuestionViewer } from './QuestionViewer';
import { HistoryTable } from './HistoryTable';
import { ExamCard } from './ExamCard';
import type { Attempt, ExamQuestion } from '../lib/exam-types';
import { formatClock, formatPercent, levelBreakdown } from '../lib/format';

const question = (id: string, over: Partial<ExamQuestion> = {}): ExamQuestion => ({
  questionId: id,
  questionVersion: 1,
  position: 1,
  title: `T-${id}`,
  statement: `Enunciado ${id}`,
  options: [
    { label: 'A', content: 'Alpha' },
    { label: 'B', content: 'Beta' },
  ],
  ...over,
});

const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  attemptId: 'att-1',
  schoolId: 's1',
  userId: 'u1',
  examId: 'e1',
  title: 'Simulado 1',
  status: 'IN_PROGRESS',
  startedAt: '2030-01-01T10:00:00.000Z',
  expiresAt: '2999-01-01T10:00:00.000Z',
  submittedAt: null,
  questions: [question('q1'), question('q2')],
  answers: [],
  result: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('QuestionViewer', () => {
  it('selects an option and reports the label', async () => {
    const onSelect = vi.fn();
    render(<QuestionViewer question={question('q1')} number={1} total={2} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('radio', { name: /Beta/ }));
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('shows a placeholder when the image fails and keeps the question usable', () => {
    render(
      <QuestionViewer
        question={question('q1', { imageUrl: 'http://localhost:9/x.png' })}
        number={1}
        total={2}
      />,
    );
    fireEvent.error(document.querySelector('img') as HTMLImageElement);
    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.getByText('Enunciado q1')).toBeTruthy();
  });

  it('shows correct answer and explanation in review mode', () => {
    render(
      <QuestionViewer
        question={question('q1', { correctOption: 'A', explanation: 'Porque sim' })}
        number={1}
        total={2}
        selected="B"
        review
      />,
    );
    expect(screen.getByText('Porque sim')).toBeTruthy();
    expect(screen.getAllByText(/Errou/).length).toBeGreaterThan(0);
  });
});

describe('AttemptSummary', () => {
  it('renders score and counts', () => {
    const result = {
      score: 100,
      correctAnswers: 2,
      wrongAnswers: 0,
      totalQuestions: 2,
      percentage: 100,
      topicResults: {},
      difficultyResults: {},
      gradeLevelResults: {},
    };
    render(
      <AttemptSummary
        attempt={attempt({
          status: 'SUBMITTED',
          submittedAt: '2030-01-01T10:10:00.000Z',
          result,
        })}
      />,
    );
    expect(screen.getByTestId('score').textContent).toContain(formatPercent(100));
    expect(screen.getByText('Acertos')).toBeTruthy();
  });

  it('renders nothing without result', () => {
    const { container } = render(<AttemptSummary attempt={attempt()} />);
    expect(container.textContent).toBe('');
  });
});

describe('QuestionNavigator', () => {
  it('navigates and labels answered state', async () => {
    const onGo = vi.fn();
    render(<QuestionNavigator total={3} current={1} answered={[true, false, false]} onGo={onGo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onGo).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onGo).toHaveBeenCalledWith(0);
    expect(screen.getAllByRole('button', { name: /não respondida/ }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /respondida$/ }).length).toBeGreaterThan(0);
  });
});

describe('QuestionTimer', () => {
  it('counts down and expires once', () => {
    vi.useFakeTimers();
    let current = 0;
    const onExpire = vi.fn();
    render(
      <QuestionTimer
        expiresAt={new Date(3000).toISOString()}
        onExpire={onExpire}
        now={() => current}
      />,
    );
    expect(screen.getByRole('timer').textContent).toContain(formatClock(3));
    current = 3000;
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});

describe('ExamCard and HistoryTable', () => {
  const exam = {
    examId: 'e1',
    title: 'Simulado 1',
    description: 'desc',
    level: 'EF1',
    status: 'PUBLISHED',
    durationMinutes: 30,
    availableFrom: null,
    availableUntil: null,
    questionCount: 2,
  };
  it('offers the right action per progress', () => {
    const { rerender } = render(<ExamCard exam={exam} progress="NOT_STARTED" attemptId={null} />);
    expect(screen.getByRole('link', { name: /Iniciar/ })).toBeTruthy();
    rerender(<ExamCard exam={exam} progress="IN_PROGRESS" attemptId="a" />);
    expect(screen.getByRole('link', { name: /Continuar/ })).toBeTruthy();
    rerender(<ExamCard exam={exam} progress="COMPLETED" attemptId="a" />);
    expect(screen.getByRole('link', { name: /Visualizar Resultado/ })).toBeTruthy();
  });

  it('lists attempts', () => {
    const done = attempt({
      status: 'SUBMITTED',
      submittedAt: '2030-01-01T10:10:00.000Z',
      result: {
        score: 50,
        correctAnswers: 1,
        wrongAnswers: 1,
        totalQuestions: 2,
        percentage: 50,
        topicResults: {},
        difficultyResults: {},
        gradeLevelResults: {},
      },
    });
    render(<HistoryTable attempts={[done]} />);
    expect(screen.getByText('Simulado 1')).toBeTruthy();
    expect(screen.getAllByText(formatPercent(50)).length).toBe(2);
  });
});

describe('format helpers', () => {
  it('breaks down by level', () => {
    const rows = levelBreakdown([question('q1', { level: 'EF1', correctOption: 'A' })], {
      q1: 'A',
    });
    expect(JSON.stringify(rows)).toContain('EF1');
  });
});

describe('ExamRunner integration', () => {
  it('saves answer in real time and finishes', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return new Response('{}', { status: 200 });
      }),
    );
    render(<ExamRunner attempt={attempt()} />);
    await userEvent.click(screen.getByRole('radio', { name: /Alpha/ }));
    await waitFor(() => expect(calls).toContain('/api/attempts/att-1/answers'));
    await userEvent.click(screen.getByRole('button', { name: /Finalizar/ }));
    const confirm = await screen.findAllByRole('button', { name: /Finalizar|Confirmar/ });
    await userEvent.click(confirm[confirm.length - 1] as HTMLElement);
    await waitFor(() => expect(calls).toContain('/api/attempts/att-1/finish'));
    await waitFor(() =>
      expect(router.push.mock.calls.length + router.replace.mock.calls.length).toBe(1),
    );
  });

  it('keeps the answer pending when the connection fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    render(<ExamRunner attempt={attempt()} />);
    await userEvent.click(screen.getByRole('radio', { name: /Alpha/ }));
    await waitFor(() =>
      expect(window.sessionStorage.getItem('mm_pending_att-1')).toContain('"q1":"A"'),
    );
  });
});
