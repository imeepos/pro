import { createLoggerConfig as createPinoConfig } from '@pro/logger';
import type { LoggerOptions } from '@pro/logger';

export { LoggerModule, PinoLogger, Logger } from 'nestjs-pino';
export type { LoggerModuleAsyncParams } from 'nestjs-pino';

export function createLoggerConfig(options: LoggerOptions) {
  const pinoConfig = createPinoConfig(options);
  return {
    pinoHttp: {
      ...pinoConfig,
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
