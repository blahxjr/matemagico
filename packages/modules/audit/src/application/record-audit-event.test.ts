import { describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '../domain/audit-event';
import { RecordAuditEvent } from './record-audit-event';

describe('RecordAuditEvent', () => {
  it('stores a serializable event with actor, scope and request correlation metadata', async () => {
    const recorded: AuditEvent[] = [];
    const record = vi.fn(async (event: AuditEvent) => {
      recorded.push(event);
    });
    const service = new RecordAuditEvent({
      repository: { record, findByActor: async () => [] },
      now: () => new Date('2026-10-12T12:00:00.000Z'),
      nextId: () => 'audit-1',
    });

    await service.execute({
      actorUserId: 'user-1',
      actorSchoolId: 'school-1',
      action: 'membership.role.granted',
      targetType: 'Grant',
      targetId: 'grant-1',
      metadata: { requestId: 'req-1', roleId: 'TEACHER' },
    });

    expect(JSON.parse(JSON.stringify(recorded[0]))).toEqual({
      auditId: 'audit-1',
      occurredAt: '2026-10-12T12:00:00.000Z',
      actorUserId: 'user-1',
      actorSchoolId: 'school-1',
      action: 'membership.role.granted',
      targetType: 'Grant',
      targetId: 'grant-1',
      reason: null,
      metadata: { requestId: 'req-1', roleId: 'TEACHER' },
    });
  });
});
