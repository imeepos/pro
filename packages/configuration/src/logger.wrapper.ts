import { Injectable } from '@pro/core';
import { createLogger, type Logger as PinoLogger } from '@pro/logger';

@Injectable({ providedIn: 'root' })
export class Logger {
  private readonly pinoLogger: PinoLogger;

  constructor() {
    this.pinoLogger = createLogger({
      serviceName: 'configuration',
      ...(process.env.LOG_LEVEL && { logLevel: process.env.LOG_LEVEL }),
    });
  }

  log(message: string, context?: string): void {
    this.pinoLogger.info({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.pinoLogger.debug({ context }, message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.pinoLogger.warn(meta, message);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.pinoLogger.error(meta, message);
  }
}
