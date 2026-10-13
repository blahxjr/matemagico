import type { AuditEvent } from './audit-event';

export interface AuditRepository {
  record(event: AuditEvent): Promise<void>;
  findByActor(actorUserId: string, limit: number): Promise<AuditEvent[]>;
}
