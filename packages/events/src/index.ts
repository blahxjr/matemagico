export type EventFoundationMetadata = {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  schoolId?: string;
};
