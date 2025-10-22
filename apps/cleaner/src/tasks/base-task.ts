import { PinoLogger } from '@pro/logger';
import { RawDataSourceDoc } from '@pro/mongodb';
import { CleanTaskMessage } from './clean-task-message';

export interface CleanTaskResult {
  postIds: string[];
  commentIds: string[];
  userIds: string[];
  notes?: Record<string, unknown>;
}

export interface CleanTaskContext {
  readonly message: CleanTaskMessage;
  readonly rawData: RawDataSourceDoc;
  readonly logger: PinoLogger;
  readonly clock: () => Date;
  readonly helpers?: unknown;
}

export abstract class BaseTask {
  constructor(protected readonly message: CleanTaskMessage) {}

  abstract readonly name: string;

  async run(context: CleanTaskContext): Promise<CleanTaskResult> {
    const startedAt = context.clock();
    try {
      const result = await this.execute(context);
      context.logger.debug(`${this.name} 执行完成`, {
        rawDataId: context.rawData._id.toString(),
        durationMs: context.clock().getTime() - startedAt.getTime(),
        posts: result.postIds.length,
        comments: result.commentIds.length,
        users: result.userIds.length,
      });
      return result;
    } catch (error) {
      context.logger.error(`${this.name} 执行失败`, {
        rawDataId: context.rawData._id.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected abstract execute(context: CleanTaskContext): Promise<CleanTaskResult>;
}
