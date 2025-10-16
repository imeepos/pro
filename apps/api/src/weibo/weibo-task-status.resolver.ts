import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { WeiboTaskStatusConsumer } from './weibo-task-status.consumer';
import { ConsumerStats } from './interfaces/weibo-task-status.interface';

/**
 * 微博任务状态监控接口
 */
@Resolver(() => Object)
export class WeiboTaskStatusResolver {
  private readonly logger = new Logger(WeiboTaskStatusResolver.name);

  constructor(private readonly taskStatusConsumer: WeiboTaskStatusConsumer) {
    this.logger.log('微博任务状态监控解析器初始化');
  }

  /**
   * 获取消费者统计信息
   */
  @Query(() => Object, { name: 'weiboTaskStatusConsumerStats' })
  getConsumerStats(): ConsumerStats {
    try {
      const stats = this.taskStatusConsumer.getStats();
      this.logger.debug('获取消费者统计信息', { stats });
      return stats;
    } catch (error) {
      this.logger.error('获取消费者统计信息失败', error);
      throw error;
    }
  }

  /**
   * 重置消费者统计信息
   */
  @Mutation(() => Boolean, { name: 'resetWeiboTaskStatusConsumerStats' })
  resetConsumerStats(): boolean {
    try {
      this.taskStatusConsumer.resetStats();
      this.logger.log('消费者统计信息已重置');
      return true;
    } catch (error) {
      this.logger.error('重置消费者统计信息失败', error);
      throw error;
    }
  }
}