import { root } from '@pro/core';
import { WeiboAccountInitService } from '@pro/workflow-nestjs';
import { createContextLogger } from '../core/logger';

/**
 * 账号初始化服务 - 微博账号健康度队列的启动者
 *
 * 使命：初始化微博账号健康度队列，为系统运行奠定基础
 */
export class AccountInitService {
  private readonly logger = createContextLogger('AccountInitService');
  private readonly weiboAccountInitService: WeiboAccountInitService;

  constructor() {
    this.weiboAccountInitService = root.get(WeiboAccountInitService);
  }

  async init(): Promise<void> {
    try {
      this.logger.info('开始初始化微博账号健康度队列');
      await this.weiboAccountInitService.onInit();
      this.logger.info('微博账号健康度队列初始化完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: '微博账号健康度队列初始化失败', error: message });
      throw error;
    }
  }
}
