import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';
import { root } from '@pro/core';
import { WeiboAccountInitService } from '@pro/workflow-nestjs';

@Injectable()
export class AccountInitService implements OnModuleInit {
  private readonly weiboAccountInitService: WeiboAccountInitService;

  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.weiboAccountInitService = root.get(WeiboAccountInitService);
    this.logger.setContext(AccountInitService.name);
  }

  async onModuleInit() {
    try {
      this.logger.info('开始初始化微博账号健康度队列');
      await this.weiboAccountInitService.onInit();
      this.logger.info('微博账号健康度队列初始化完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('微博账号健康度队列初始化失败', { error: message });
    }
  }
}
