import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: PinoLogger) {}

  getHealth() {
    this.logger.debug('健康检查请求');
    return {
      status: 'ok',
      service: 'analyzer',
      timestamp: new Date().toISOString(),
    };
  }
}
