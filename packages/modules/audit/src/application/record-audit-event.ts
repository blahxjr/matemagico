import { AuditEvent, type AuditMetadata } from '../domain/audit-event';
import type { AuditRepository } from '../domain/audit.repository';

export interface RecordAuditEventInput {
  readonly actorUserId?: string | null;
  readonly actorSchoolId?: string | null;
  readonly action: string;
  readonly targetType: string;
  readonly targetId?: string | null;
  readonly reason?: string | null;
  readonly metadata?: AuditMetadata;
}

export class RecordAuditEvent {
  constructor(
    private readonly deps: {
      readonly repository: AuditRepository;
      readonly now: () => Date;
      readonly nextId: () => string;
    },
  ) {}

  async execute(input: RecordAuditEventInput): Promise<void> {
    const event = AuditEvent.create({
      auditId: this.deps.nextId(),
      occurredAt: this.deps.now(),
      actorUserId: input.actorUserId ?? null,
      actorSchoolId: input.actorSchoolId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    });
    await this.deps.repository.record(event);
  }
}
