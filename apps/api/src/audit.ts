import { getLogContext } from '@matemagico/logger';
import type { CompositionRoot } from '@matemagico/composition-root';

export async function recordAudit(
  root: CompositionRoot,
  event: {
    readonly actorUserId: string | null;
    readonly actorSchoolId?: string | null;
    readonly action: string;
    readonly targetType: string;
    readonly targetId?: string | null;
    readonly reason?: string | null;
    readonly metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  const context = getLogContext();
  await root.services.recordAuditEvent.execute({
    ...event,
    metadata: {
      ...event.metadata,
      requestId: typeof context.requestId === 'string' ? context.requestId : null,
      correlationId: typeof context.correlationId === 'string' ? context.correlationId : null,
    },
  });
}
