import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

interface StructuredLogPayload {
  time: string;
  level: LogLevel;
  service: string;
  scope?: string;
  message: string;
  msg: string;
  context?: Record<string, unknown>;
}

type LogContext = Record<string, unknown> | Error | unknown;
type LogTransport = (payload: StructuredLogPayload) => void;

interface LoggerOptions {
  service: string;
  level?: LogLevel;
  scope?: string;
  transport?: LogTransport;
  context?: Record<string, unknown>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeContext = (context: LogContext | undefined): Record<string, unknown> | undefined => {
  if (context === undefined || context === null) {
    return undefined;
  }

  if (context instanceof Error) {
    return {
      name: context.name,
      message: context.message,
      stack: context.stack
    };
  }

  if (isPlainObject(context)) {
    return { ...context };
  }

  if (Array.isArray(context)) {
    return { value: [...context] };
  }

  return { value: context };
};

const consoleWriter: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

export class StructuredLogger {
  private readonly service: string;
  private readonly scope?: string;
  private readonly level: LogLevel;
  private readonly transport?: LogTransport;
  private readonly context: Record<string, unknown>;

  constructor(options: LoggerOptions) {
    this.service = options.service;
    this.scope = options.scope;
    this.level = options.level ?? (environment.production ? 'info' : 'debug');
    this.transport = options.transport;
    this.context = options.context ?? {};
  }

  withScope(scope: string, context?: Record<string, unknown>): StructuredLogger {
    const mergedContext = {
      ...this.context,
      ...(context ?? {})
    };

    return new StructuredLogger({
      service: this.service,
      level: this.level,
      transport: this.transport,
      scope: this.scope ? `${this.scope}.${scope}` : scope,
      context: mergedContext
    });
  }

  withContext(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({
      service: this.service,
      level: this.level,
      transport: this.transport,
      scope: this.scope,
      context: {
        ...this.context,
        ...context
      }
    });
  }

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.emit('error', message, context);
  }

  log(message: string, context?: LogContext): void {
    this.info(message, context);
  }

  private emit(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const normalizedContext = normalizeContext(context);
    const baseContext = Object.keys(this.context).length > 0 ? { ...this.context } : undefined;
    const mergedContext =
      normalizedContext && baseContext
        ? { ...baseContext, ...normalizedContext }
        : normalizedContext ?? baseContext;

    const payload: StructuredLogPayload = {
      time: new Date().toISOString(),
      level,
      service: this.service,
      scope: this.scope,
      message,
      msg: message,
      ...(mergedContext ? { context: mergedContext } : {})
    };

    if (this.transport) {
      this.transport(payload);
    }

    const scopeLabel = this.scope ? `${this.service}/${this.scope}` : this.service;
    const prefix = `[${scopeLabel}]`;
    if (payload.context) {
      consoleWriter[level](`${prefix} ${payload.message}`, payload.context);
    } else {
      consoleWriter[level](`${prefix} ${payload.message}`);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }
}

export const logger = new StructuredLogger({
  service: 'apps-admin'
});

export type { LogLevel, StructuredLogPayload, LogContext, LogTransport };
