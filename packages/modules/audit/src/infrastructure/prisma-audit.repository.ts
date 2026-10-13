import type { Prisma, PrismaClient } from '@prisma/client';
import { AuditEvent } from '../domain/audit-event';
import type { AuditRepository } from '../domain/audit.repository';

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: AuditEvent): Promise<void> {
    const { props } = event;
    await this.prisma.auditEvent.create({
      data: {
        ...props,
        metadata: props.metadata as Prisma.InputJsonObject,
      },
    });
  }

  async findByActor(actorUserId: string, limit: number): Promise<AuditEvent[]> {
    const rows = await this.prisma.auditEvent.findMany({
      where: { actorUserId },
      orderBy: [{ occurredAt: 'desc' }, { auditId: 'desc' }],
      take: limit,
    });
    return rows.map((row) =>
      AuditEvent.create({
        ...row,
        metadata:
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, string | number | boolean | null>)
            : {},
      }),
    );
  }
}
