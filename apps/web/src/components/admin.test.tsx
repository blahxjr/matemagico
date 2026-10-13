import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const callBff = vi.fn();
vi.mock('../lib/bff-client', () => ({ callBff: (...args: unknown[]) => callBff(...args) }));

import { PerformanceCards } from './PerformanceCards';
import { PublishExamButton } from './PublishExamButton';
import { EditExamForm } from './EditExamForm';
import { RankingTable } from './RankingTable';
import { StudentTable } from './StudentTable';
import { canAccess } from '../lib/navigation';

beforeEach(() => {
  callBff.mockReset();
  router.refresh.mockReset();
});

describe('admin components', () => {
  it('lists members and activates a pending one', async () => {
    callBff.mockResolvedValue({ ok: true });
    render(
      <StudentTable
        members={[
          {
            membershipId: 'm1',
            userId: 'u1',
            name: 'Ana',
            email: 'a@x.com',
            state: 'PENDING',
            roles: [],
          },
          {
            membershipId: 'm2',
            userId: 'u2',
            name: 'Bia',
            email: 'b@x.com',
            state: 'ACTIVE',
            roles: ['STUDENT'],
          },
        ]}
      />,
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('b@x.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ativar/i }));
    expect(callBff).toHaveBeenCalledWith('/api/memberships/m1/activate', 'POST', {});
  });

  it('renders ranking rows in order with positions', () => {
    render(
      <RankingTable
        caption="Ranking"
        nameOf={(id) => `N-${id}`}
        rows={[
          {
            position: 1,
            studentId: 'a',
            score: 90,
            correctAnswers: 9,
            timeSpentSeconds: 60,
            completedAt: '2026-01-01T00:00:00Z',
            attempts: 1,
          },
          {
            position: 2,
            studentId: 'b',
            score: 80,
            correctAnswers: 8,
            timeSpentSeconds: 70,
            completedAt: '2026-01-01T00:00:00Z',
            attempts: 1,
          },
        ]}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('N-a');
    expect(rows[2]).toHaveTextContent('N-b');
  });

  it('renders performance by student and topic', () => {
    render(
      <PerformanceCards
        studentName={(id) => `S-${id}`}
        topicName={(id) => `T-${id}`}
        students={[
          { studentId: 's1', attempts: 2, averageScore: 75, lastScore: 80, lastAttemptAt: null },
        ]}
        topics={[{ topicId: 't1', correctAnswers: 3, wrongAnswers: 1, percentage: 75 }]}
      />,
    );
    expect(screen.getByText('S-s1')).toBeInTheDocument();
    expect(screen.getByText('T-t1')).toBeInTheDocument();
  });

  it('publishes an exam through the BFF', async () => {
    callBff.mockResolvedValue({ ok: true });
    render(<PublishExamButton examId="e1" title="Prova" />);
    await userEvent.click(screen.getByRole('button'));
    expect(callBff).toHaveBeenCalledWith('/api/exams/e1/publish', 'POST', {});
  });

  it('edits a draft through the BFF', async () => {
    callBff.mockResolvedValue({ ok: true });
    render(
      <EditExamForm
        exam={{
          examId: 'e1',
          title: 'Prova',
          description: null,
          level: 'OBMEP_N1',
          status: 'DRAFT',
          durationMinutes: 30,
          availableFrom: null,
          availableUntil: null,
          publishedAt: null,
          questions: [],
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editar Prova' }));
    await userEvent.clear(screen.getByLabelText('Título do simulado Prova'));
    await userEvent.type(screen.getByLabelText('Título do simulado Prova'), 'Prova revisada');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações de Prova' }));
    expect(callBff).toHaveBeenCalledWith('/api/exams/e1', 'PATCH', {
      title: 'Prova revisada',
      description: null,
      durationMinutes: 30,
      availableFrom: null,
      availableUntil: null,
    });
  });
});

describe('canAccess for staff', () => {
  it('lets teachers into exams, rankings and performance but not students', () => {
    expect(canAccess(['TEACHER'], '/app/admin/exams')).toBe(true);
    expect(canAccess(['TEACHER'], '/app/admin/rankings')).toBe(true);
    expect(canAccess(['TEACHER'], '/app/admin/performance')).toBe(true);
    expect(canAccess(['TEACHER'], '/app/admin/students')).toBe(false);
    expect(canAccess(['STUDENT'], '/app/admin/exams')).toBe(false);
    expect(canAccess(['SCHOOL_ADMIN'], '/app/admin/students')).toBe(true);
  });
});
