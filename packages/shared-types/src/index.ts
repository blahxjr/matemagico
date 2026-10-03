export type CorrelationContext = {
  requestId?: string;
  correlationId?: string;
};

export type SchoolScopedContext = CorrelationContext & {
  schoolId: string;
};

export type ApplicationResult<T> =
  { ok: true; value: T } | { ok: false; code: string; message: string };
