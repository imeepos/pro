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

  const useMultipleTargets = targets.length > 1;

  const baseConfig = {
    name: serviceName,
    level,
    transport: useMultipleTargets ? { targets } : targets[0],
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
    ...(useMultipleTargets
      ? {}
      : { formatters: { level: (label: string) => ({ level: label }) } }
    ),
  };

  return { pinoHttp: baseConfig };
}