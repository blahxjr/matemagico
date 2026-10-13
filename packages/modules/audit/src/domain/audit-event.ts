export type AuditMetadata = Readonly<Record<string, string | number | boolean | null>>;

export interface AuditEventInput {
  readonly auditId: string;
  readonly occurredAt: Date;
  readonly actorUserId: string | null;
  readonly actorSchoolId: string | null;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly reason: string | null;
  readonly metadata: AuditMetadata;
}

export class AuditEvent {
  private constructor(readonly props: AuditEventInput) {}

  static create(input: AuditEventInput): AuditEvent {
    if (!input.auditId.trim() || !input.action.trim() || !input.targetType.trim()) {
      throw new Error('Audit event requires an id, action and target type.');
    }
    if (!Number.isFinite(input.occurredAt.getTime())) {
      throw new Error('Audit event requires a valid occurrence time.');
    }
    return new AuditEvent({
      ...input,
      metadata: Object.freeze({ ...input.metadata }),
    });
  }

  toJSON(): AuditEventInput {
    return {
      ...this.props,
      occurredAt: new Date(this.props.occurredAt),
      metadata: { ...this.props.metadata },
    };
  }
}
