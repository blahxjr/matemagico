import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { RecordAuditEvent } from '../application/record-audit-event';
import { PrismaAuditRepository } from './prisma-audit.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaAuditRepository', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const repository = new PrismaAuditRepository(prisma);

  afterAll(() => prisma.$disconnect());

  it('persists and queries an audit event by actor', async () => {
    const actorUserId = `audit-user-${randomUUID()}`;
    const service = new RecordAuditEvent({
      repository,
      now: () => new Date('2026-10-13T12:00:00.000Z'),
      nextId: randomUUID,
    });

    try {
      await service.execute({
        actorUserId,
        actorSchoolId: 'audit-school',
        action: 'privacy.data.exported',
        targetType: 'User',
        targetId: actorUserId,
        metadata: { membershipCount: 2 },
      });
      const events = await repository.findByActor(actorUserId, 10);
      expect(events).toHaveLength(1);
      expect(events[0]?.toJSON()).toMatchObject({
        actorUserId,
        actorSchoolId: 'audit-school',
        action: 'privacy.data.exported',
        targetType: 'User',
        targetId: actorUserId,
        metadata: { membershipCount: 2 },
      });
    } finally {
      await prisma.auditEvent.deleteMany({ where: { actorUserId } });
    }
  });
});
