type LogContext = Record<string, unknown>;

class Logger {
  withScope(scope: string, context?: LogContext) {
    return {
      info: (message: string, data?: LogContext) => {
        console.log(`[${scope}] ${message}`, { ...context, ...data });
      },
      warn: (message: string, data?: LogContext) => {
        console.warn(`[${scope}] ${message}`, { ...context, ...data });
      },
      error: (message: string, data?: LogContext) => {
        console.error(`[${scope}] ${message}`, { ...context, ...data });
      }
    };
  }
}

export const logger = new Logger();
