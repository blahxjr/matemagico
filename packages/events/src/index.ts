import type { EventEnvelope } from './contracts';

export {
  assertEventContract,
  EventContractError,
  type DomainEvent,
  type EventEnvelope,
  type MembershipCreatedEvent,
  type RoleGrantedEvent,
  type AttemptCompletedEvent,
} from './contracts';

export type EventFoundationMetadata = Pick<
  EventEnvelope,
  'eventId' | 'schemaVersion' | 'occurredAt' | 'correlationId' | 'causationId' | 'schoolId'
>;
