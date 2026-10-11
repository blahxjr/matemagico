import { describe, expect, it } from 'vitest';
import { assertEventContract, EventContractError, type DomainEvent } from './contracts';

const membershipCreated: DomainEvent = {
  eventId: 'event-membership-1',
  eventName: 'MembershipCreated',
  aggregateId: 'membership-1',
  aggregateType: 'SchoolMembership',
  occurredAt: '2026-10-09T12:00:00.000Z',
  schemaVersion: 1,
  correlationId: 'request-1',
  causationId: 'command-1',
  schoolId: 'school-1',
  payload: {
    membershipId: 'membership-1',
    userId: 'user-1',
    schoolId: 'school-1',
  },
};

const roleGranted: DomainEvent = {
  eventId: 'event-grant-1',
  eventName: 'RoleGranted',
  aggregateId: 'grant-1',
  aggregateType: 'Grant',
  occurredAt: '2026-10-09T12:00:00.000Z',
  schemaVersion: 1,
  correlationId: 'request-2',
  causationId: 'command-2',
  schoolId: 'school-1',
  payload: {
    grantId: 'grant-1',
    membershipId: 'membership-1',
    roleId: 'teacher',
    schoolId: 'school-1',
    grantedBy: 'admin-1',
  },
};

describe('Membership event contracts', () => {
  it.each([
    ['MembershipCreated', membershipCreated],
    ['RoleGranted', roleGranted],
  ])('accepts a valid %s event', (_name, event) => {
    expect(() => assertEventContract(event)).not.toThrow();
  });

  it.each([
    ['eventId', { ...membershipCreated, eventId: undefined }],
    ['aggregateId', { ...membershipCreated, aggregateId: undefined }],
    ['schemaVersion', { ...membershipCreated, schemaVersion: undefined }],
    ['eventName', { ...membershipCreated, eventName: undefined }],
    ['aggregateType', { ...membershipCreated, aggregateType: undefined }],
    ['occurredAt', { ...membershipCreated, occurredAt: undefined }],
    ['correlationId', { ...membershipCreated, correlationId: undefined }],
    ['causationId', { ...membershipCreated, causationId: undefined }],
    ['payload fields', { ...membershipCreated, payload: { membershipId: 'membership-1' } }],
    ['unsupported schemaVersion', { ...membershipCreated, schemaVersion: 2 }],
    ['invalid UTC timestamp', { ...membershipCreated, occurredAt: '2026-02-30T12:00:00Z' }],
    ['mismatched aggregate identity', { ...membershipCreated, aggregateId: 'other-id' }],
    ['mismatched school scope', { ...membershipCreated, schoolId: 'other-school' }],
  ])('rejects invalid %s', (_case, event) => {
    expect(() => assertEventContract(event)).toThrow(EventContractError);
  });

  it('rejects an unsupported event name', () => {
    expect(() =>
      assertEventContract({ ...membershipCreated, eventName: 'UnregisteredEvent' }),
    ).toThrow('Unsupported eventName');
  });

  it('rejects values that cannot be serialized as JSON', () => {
    const cyclicPayload: Record<string, unknown> = {
      ...membershipCreated.payload,
      extra: {},
    };
    cyclicPayload.extra = cyclicPayload;
    expect(() => assertEventContract({ ...membershipCreated, payload: cyclicPayload })).toThrow(
      'JSON-serializable',
    );
    expect(() =>
      assertEventContract({
        ...roleGranted,
        payload: { ...roleGranted.payload, unsupported: BigInt(1) },
      }),
    ).toThrow('JSON-serializable');
  });
});
