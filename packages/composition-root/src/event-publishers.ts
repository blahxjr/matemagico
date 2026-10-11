import { logger } from '@matemagico/logger';
import type { SchoolEventPublisher } from '@matemagico/schools';
import type { UserEventPublisher } from '@matemagico/users';
import type { MembershipEventPublisher } from '@matemagico/membership';

/** Events are only logged until the outbox exists. */
export const discardingEventPublisher: MembershipEventPublisher = {
  publishMembershipCreated: async (event) => {
    logger.warn('domain_event.discarded', {
      module: 'membership',
      eventName: 'MembershipCreated',
      aggregateType: 'SchoolMembership',
      aggregateId: event.membershipId,
      schoolId: event.schoolId,
      occurredAt: event.occurredAt.toISOString(),
      outcome: 'discarded',
    });
  },
  publishRoleGranted: async (event) => {
    logger.warn('domain_event.discarded', {
      module: 'membership',
      eventName: 'RoleGranted',
      aggregateType: 'Grant',
      aggregateId: event.grantId,
      schoolId: event.schoolId,
      occurredAt: event.occurredAt.toISOString(),
      outcome: 'discarded',
    });
  },
};

export const discardingUserEventPublisher: UserEventPublisher = {
  publishUserRegistered: async (event) => {
    logger.warn('domain_event.discarded', {
      module: 'users',
      eventName: 'UserRegistered',
      aggregateType: 'User',
      aggregateId: event.userId,
      schoolId: null,
      occurredAt: event.occurredAt.toISOString(),
      outcome: 'discarded',
    });
  },
};

export const discardingSchoolEventPublisher: SchoolEventPublisher = {
  publishSchoolCreated: async (event) => {
    logger.warn('domain_event.discarded', {
      module: 'schools',
      eventName: 'SchoolCreated',
      aggregateType: 'School',
      aggregateId: event.schoolId,
      schoolId: event.schoolId,
      occurredAt: event.occurredAt.toISOString(),
      outcome: 'discarded',
    });
  },
};
