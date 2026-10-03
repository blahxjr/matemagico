export interface Clock {
  now(): Date;
}

export interface SessionIdGenerator {
  next(): string;
}
