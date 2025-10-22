import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { DlqManagerService } from '@pro/rabbitmq';
import type { DlqMessage } from '@pro/types';
import { DlqQueueInfoModel } from './models/dlq-queue.model';
import { DlqMessageConnection } from './models/dlq-connection.model';
import { DlqQueryInput } from './dto/dlq-query.dto';
import { RetryMessagesInput } from './dto/retry-messages.dto';
import { DeleteMessagesInput } from './dto/delete-messages.dto';
import { OFFSET_CURSOR_PREFIX } from '../common/models/pagination.model';
import { DlqMessageModel } from './models/dlq-message.model';

@Resolver()
export class DlqResolver implements OnModuleDestroy {
  private readonly logger = new Logger(DlqResolver.name);

  constructor(private readonly dlqManager: DlqManagerService) {}

  @Query(() => [DlqQueueInfoModel], {
    description: '获取所有死信队列信息',
  })
  async dlqQueues(): Promise<DlqQueueInfoModel[]> {
    return this.dlqManager.getDlqQueues();
  }

  @Query(() => DlqMessageConnection, {
    description: '分页查询死信队列中的消息',
  })
  async dlqMessages(
    @Args('filter', { type: () => DlqQueryInput, nullable: true })
    filter?: DlqQueryInput,
  ): Promise<DlqMessageConnection> {
    const queueName = filter?.queueName?.trim();
    if (!queueName) {
      throw new Error('queueName 不能为空');
    }

    try {
      const page = filter?.page && filter.page > 0 ? filter.page : 1;
      const pageSize =
        filter?.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const [totalCount, snapshot] = await Promise.all([
        this.dlqManager.getMessageCount(queueName),
        this.dlqManager.getDlqMessages(queueName),
      ]);

      const slice = snapshot.slice(startIndex, endIndex);
      const edges = slice.map((raw, index) => ({
        cursor: `${OFFSET_CURSOR_PREFIX}${startIndex + index + 1}`,
        node: this.composeGraphNode(raw, queueName),
      }));

      return {
        edges,
        totalCount,
        pageInfo: {
          hasPreviousPage: page > 1,
          hasNextPage: endIndex < totalCount,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
      };
    } catch (error) {
      this.logger.error(
        `查询死信消息失败: ${queueName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('死信消息查询失败，请稍后再试');
    }
  }

  @Mutation(() => Boolean, { description: '将死信消息重新投递到原队列' })
  async retryDlqMessages(
    @Args('input', { type: () => RetryMessagesInput })
    input: RetryMessagesInput,
  ): Promise<boolean> {
    try {
      const retried = await this.dlqManager.retryMessages(
        input.queueName,
        input.messageIds,
      );

      const success = retried === input.messageIds.length;
      if (!success) {
        this.logger.warn(
          `部分死信消息未成功重试: ${input.queueName} (${retried}/${input.messageIds.length})`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `重试死信消息失败: ${input.queueName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('重试死信消息失败，请稍后重试');
    }
  }

  @Mutation(() => Boolean, { description: '删除死信队列中的消息' })
  async deleteDlqMessages(
    @Args('input', { type: () => DeleteMessagesInput })
    input: DeleteMessagesInput,
  ): Promise<boolean> {
    try {
      const deleted = await this.dlqManager.deleteMessages(
        input.queueName,
        input.messageIds,
      );

      const success = deleted === input.messageIds.length;
      if (!success) {
        this.logger.warn(
          `部分死信消息未删除: ${input.queueName} (${deleted}/${input.messageIds.length})`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `删除死信消息失败: ${input.queueName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('删除死信消息失败，请稍后重试');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.dlqManager.close().catch((error) => {
      this.logger.warn(
        `关闭死信队列连接失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  private composeGraphNode(raw: DlqMessage, queueName: string): DlqMessageModel {
    try {
      return new DlqMessageModel({
        id: raw.id,
        queueName: raw.queueName ?? queueName,
        content: raw.content,
        failedAt: raw.failedAt,
        retryCount: raw.retryCount,
        errorMessage: raw.errorMessage,
      });
    } catch (error) {
      this.logger.warn(
        `死信消息序列化失败，使用当前时间兜底: ${raw.id}`,
        error instanceof Error ? error.stack : undefined,
      );

      return new DlqMessageModel({
        id: raw.id,
        queueName: raw.queueName ?? queueName,
        content: raw.content,
        failedAt: new Date(),
        retryCount: raw.retryCount,
        errorMessage: raw.errorMessage,
      });
    }
  }
}
