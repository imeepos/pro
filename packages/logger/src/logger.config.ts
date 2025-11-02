import type { LoggerOptions as PinoLoggerOptions } from 'pino';

export interface LoggerOptions {
  serviceName: string;
  logLevel?: string;
  logDir?: string;
  enablePretty?: boolean;
}

export function createLoggerConfig(options: LoggerOptions): PinoLoggerOptions {
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
        ignore: 'req.headers,res.headers',
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        messageFormat: `[${serviceName}] {msg}`,
        encoding: 'utf8',
      },
    });
  }

  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: `${logDir}/${serviceName}-error.log`,
      mkdir: true,
      encoding: 'utf8',
    },
  });

  if (isProduction) {
    targets.push({
      target: 'pino/file',
      level: 'info',
      options: {
        destination: `${logDir}/${serviceName}.log`,
        mkdir: true,
        encoding: 'utf8',
      },
    });
  }

  return {
    name: serviceName,
    level,
    transport: targets.length > 1 ? { targets } : targets[0],
  };
}
