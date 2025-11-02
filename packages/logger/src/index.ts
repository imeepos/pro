import pino from 'pino';
import type { Logger } from 'pino';

export { createLoggerConfig } from './logger.config';
export type { LoggerOptions } from './logger.config';
export type { Logger };

export function createLogger(options: {
  serviceName: string;
  logLevel?: string;
  logDir?: string;
  enablePretty?: boolean;
}): Logger {
  const { serviceName, logLevel, logDir = './logs', enablePretty = true } = options;

  const level = logLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  const isProduction = process.env.NODE_ENV === 'production';

  const targets: any[] = [];

  if (enablePretty && !isProduction) {
    targets.push({
      target: 'pino-pretty',
      level: 'debug',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        messageFormat: `[${serviceName}] {msg}`,
      },
    });
  }

  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: `${logDir}/${serviceName}-error.log`,
      mkdir: true,
    },
  });

  if (isProduction) {
    targets.push({
      target: 'pino/file',
      level: 'info',
      options: {
        destination: `${logDir}/${serviceName}.log`,
        mkdir: true,
      },
    });
  }

  return pino({
    name: serviceName,
    level,
    transport: targets.length > 1 ? { targets } : targets[0],
  });
}
