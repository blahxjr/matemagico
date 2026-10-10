import { AsyncLocalStorage } from 'node:async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  correlationId?: string;
  schoolId?: string | null;
  module?: string;
  [key: string]: unknown;
};

export type LogEntry = LogContext & {
  level: LogLevel;
  message: string;
  timestamp: string;
};

const contextStorage = new AsyncLocalStorage<LogContext>();

export function withLogContext<T>(context: LogContext, callback: () => T): T {
  return contextStorage.run({ ...contextStorage.getStore(), ...context }, callback);
}

export function addLogContext(context: LogContext): void {
  const activeContext = contextStorage.getStore();
  if (activeContext) Object.assign(activeContext, context);
}

export function createLogger(baseContext: LogContext = {}) {
  return {
    log(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
      const entry: LogEntry = {
        ...baseContext,
        ...contextStorage.getStore(),
        ...context,
        level,
        message,
        timestamp: new Date().toISOString(),
      };
      console[level === 'debug' ? 'log' : level](JSON.stringify(entry));
      return entry;
    },
    debug(message: string, context?: LogContext) {
      return this.log('debug', message, context);
    },
    info(message: string, context?: LogContext) {
      return this.log('info', message, context);
    },
    warn(message: string, context?: LogContext) {
      return this.log('warn', message, context);
    },
    error(message: string, context?: LogContext) {
      return this.log('error', message, context);
    },
  };
}

export const logger = createLogger();
