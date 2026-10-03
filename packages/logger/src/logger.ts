export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
};

export type LogEntry = LogContext & {
  level: LogLevel;
  message: string;
  timestamp: string;
};

export function createLogger(baseContext: LogContext = {}) {
  return {
    log(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
      const entry: LogEntry = {
        ...baseContext,
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
