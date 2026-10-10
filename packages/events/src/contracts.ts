export type EventEnvelope = {
  eventId: string;
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  schemaVersion: number;
  correlationId: string;
  causationId: string;
  schoolId?: string;
  payload: Record<string, unknown>;
};

export type MembershipCreatedEvent = EventEnvelope & {
  eventName: 'MembershipCreated';
  aggregateType: 'SchoolMembership';
  payload: {
    membershipId: string;
    userId: string;
    schoolId: string;
  };
};

export type RoleGrantedEvent = EventEnvelope & {
  eventName: 'RoleGranted';
  aggregateType: 'Grant';
  payload: {
    grantId: string;
    membershipId: string;
    roleId: string;
    schoolId: string;
    grantedBy: string;
  };
};

export type DomainEvent = MembershipCreatedEvent | RoleGrantedEvent;

export class EventContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventContractError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isJsonValue = (value: unknown, ancestors = new Set<object>()): boolean => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) return false;
    ancestors.add(value);
    const valid = value.every((item, index) => index in value && isJsonValue(item, ancestors));
    ancestors.delete(value);
    return valid;
  }

  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, ancestors));
  ancestors.delete(value);
  return valid;
};

const isUtcTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
};

const requireString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (!isNonEmptyString(value)) throw new EventContractError(`${key} must be a non-empty string`);
  return value;
};

const validatePayload = (eventName: string, payload: Record<string, unknown>): void => {
  const requiredFields: Record<string, string[]> = {
    MembershipCreated: ['membershipId', 'userId', 'schoolId'],
    RoleGranted: ['grantId', 'membershipId', 'roleId', 'schoolId', 'grantedBy'],
  };
  const fields = requiredFields[eventName];
  if (!fields) throw new EventContractError(`Unsupported eventName: ${eventName}`);

  for (const field of fields) requireString(payload, field);
  if (!isJsonValue(payload)) {
    throw new EventContractError('payload must contain only JSON-serializable values');
  }
};

export function assertEventContract(value: unknown): asserts value is DomainEvent {
  if (!isRecord(value)) throw new EventContractError('event must be an object');

  requireString(value, 'eventId');
  const eventName = requireString(value, 'eventName');
  const aggregateId = requireString(value, 'aggregateId');
  const aggregateType = requireString(value, 'aggregateType');
  requireString(value, 'correlationId');
  requireString(value, 'causationId');

  if (!isUtcTimestamp(value.occurredAt)) {
    throw new EventContractError('occurredAt must be a valid UTC timestamp');
  }
  if (!Number.isInteger(value.schemaVersion) || value.schemaVersion !== 1) {
    throw new EventContractError(`${eventName} schemaVersion must be 1`);
  }
  if (value.schoolId !== undefined && !isNonEmptyString(value.schoolId)) {
    throw new EventContractError('schoolId must be a non-empty string when provided');
  }
  if (!isRecord(value.payload)) throw new EventContractError('payload must be an object');

  validatePayload(eventName, value.payload);

  if (eventName === 'MembershipCreated') {
    if (aggregateType !== 'SchoolMembership') {
      throw new EventContractError('MembershipCreated aggregateType must be SchoolMembership');
    }
    if (aggregateId !== value.payload.membershipId) {
      throw new EventContractError('MembershipCreated aggregateId must match payload.membershipId');
    }
  } else if (eventName === 'RoleGranted') {
    if (aggregateType !== 'Grant') {
      throw new EventContractError('RoleGranted aggregateType must be Grant');
    }
    if (aggregateId !== value.payload.grantId) {
      throw new EventContractError('RoleGranted aggregateId must match payload.grantId');
    }
  } else {
    throw new EventContractError(`Unsupported eventName: ${eventName}`);
  }

  if (value.schoolId !== value.payload.schoolId) {
    throw new EventContractError('schoolId must match the school-scoped payload');
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined || !isRecord(JSON.parse(serialized))) {
      throw new EventContractError('event must be JSON-serializable');
    }
  } catch (error) {
    if (error instanceof EventContractError) throw error;
    throw new EventContractError('event must be JSON-serializable');
  }
}
