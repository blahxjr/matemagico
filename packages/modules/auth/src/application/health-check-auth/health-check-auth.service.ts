import type { AvailabilityProbe } from '../ports/availability-probe';

export type HealthCheckAuthOutput = { state: 'READY' } | { state: 'NOT_READY' };

export interface HealthCheckAuthDependencies {
  /** Required capabilities: Auth persistence, Users contract and any other decision dependency. */
  readonly probes: readonly AvailabilityProbe[];
}

export class HealthCheckAuthService {
  constructor(private readonly deps: HealthCheckAuthDependencies) {}

  async execute(): Promise<HealthCheckAuthOutput> {
    // Fail closed: no probes, a negative answer or a thrown error all mean NOT_READY.
    if (this.deps.probes.length === 0) return { state: 'NOT_READY' };
    try {
      const answers = await Promise.all(
        this.deps.probes.map((probe) => probe.isAvailable().catch(() => false)),
      );
      return answers.every((available) => available === true)
        ? { state: 'READY' }
        : { state: 'NOT_READY' };
    } catch {
      return { state: 'NOT_READY' };
    }
  }
}
