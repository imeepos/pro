import type { LoggerModuleAsyncParams } from 'nestjs-pino';

interface LoggerOptions {
  serviceName: string;
  logLevel?: string;
  logDir?: string;
  enablePretty?: boolean;
}

export function createLoggerConfig(options: LoggerOptions): any {
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

  return {
    pinoHttp: {
      name: serviceName,
      level,
      transport: targets.length > 1 ? { targets } : targets[0],
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      serializers: {
        req: (req: any) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res: any) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
}