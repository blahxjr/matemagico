import { randomUUID } from 'node:crypto';
import type { Clock, SessionIdGenerator } from '../../application/ports/runtime';

export const systemClock: Clock = { now: () => new Date() };

export const uuidSessionIdGenerator: SessionIdGenerator = { next: () => randomUUID() };
