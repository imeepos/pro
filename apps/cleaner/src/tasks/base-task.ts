import { Logger } from '@nestjs/common';
import { RawDataSourceDoc } from '@pro/mongodb';
import { CleanTaskMessage } from './clean-task-message';
import { serializeError } from '../utils/serialize-error';
import { narrate } from '../utils/logging';

export interface CleanTaskResult {
  postIds: string[];
  commentIds: string[];
  userIds: string[];
  notes?: Record<string, unknown>;
}

export interface CleanTaskContext {
  readonly message: CleanTaskMessage;
  readonly rawData: RawDataSourceDoc;
  readonly logger: Logger;
  readonly clock: () => Date;
  readonly helpers?: unknown;
}

export abstract class BaseTask {
  constructor(protected readonly message: CleanTaskMessage) {}

  abstract readonly name: string;

  async run(context: CleanTaskContext): Promise<CleanTaskResult> {
    const startedAt = context.clock();
    context.logger.debug(narrate(`${this.name} 开始执行`, {
      rawDataId: context.rawData._id.toString(),
      startedAt: startedAt.toISOString(),
    }));

    try {
      const result = await this.execute(context);
      const finishedAt = context.clock();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      context.logger.log(narrate(`${this.name} 执行完成`, {
        rawDataId: context.rawData._id.toString(),
        finishedAt: finishedAt.toISOString(),
        durationMs,
        posts: result.postIds.length,
        comments: result.commentIds.length,
        users: result.userIds.length,
      }));
      return result;
    } catch (error) {
      const failedAt = context.clock();
      context.logger.error(narrate(`${this.name} 执行失败`, {
        rawDataId: context.rawData._id.toString(),
        failedAt: failedAt.toISOString(),
        durationMs: failedAt.getTime() - startedAt.getTime(),
        error: serializeError(error),
      }));
      throw error;
    }
  }

  protected abstract execute(context: CleanTaskContext): Promise<CleanTaskResult>;
}
