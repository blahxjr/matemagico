import { afterEach, describe, expect, it, vi } from 'vitest';
import { withLogContext } from '@matemagico/logger';
import { discardingEventPublisher } from './provisional-ports';

describe('discarding event publisher observability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs MembershipCreated with school and request correlation metadata', async () => {
    const output = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await withLogContext(
      {
        requestId: 'request-1',
        correlationId: 'correlation-1',
        module: 'membership',
        schoolId: null,
      },
      () =>
        discardingEventPublisher.publishMembershipCreated({
          membershipId: 'membership-1',
          userId: 'user-1',
          schoolId: 'school-1',
          occurredAt: new Date('2026-10-10T12:00:00.000Z'),
        }),
    );

    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
      message: 'domain_event.discarded',
      requestId: 'request-1',
      correlationId: 'correlation-1',
      eventName: 'MembershipCreated',
      aggregateType: 'SchoolMembership',
      aggregateId: 'membership-1',
      schoolId: 'school-1',
      outcome: 'discarded',
    });
  });

  it('logs RoleGranted with school context without exposing the actor identity', async () => {
    const output = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await discardingEventPublisher.publishRoleGranted({
      grantId: 'grant-1',
      membershipId: 'membership-1',
      roleId: 'teacher',
      schoolId: 'school-1',
      grantedBy: 'private-actor-value',
      occurredAt: new Date('2026-10-10T12:00:00.000Z'),
    });

    const line = String(output.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      message: 'domain_event.discarded',
      eventName: 'RoleGranted',
      aggregateType: 'Grant',
      aggregateId: 'grant-1',
      schoolId: 'school-1',
      outcome: 'discarded',
    });
    expect(line).not.toContain('private-actor-value');
  });
});
