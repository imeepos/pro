import { BaseTask, CleanTaskContext, CleanTaskResult } from '../base-task';
import { CleanTaskMessage } from '../clean-task-message';
import { WeiboPersistenceService } from '../../services/weibo-persistence.service';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';

interface WeiboHelperBag {
  weibo: WeiboPersistenceService;
}

export type WeiboTaskContext = CleanTaskContext & {
  helpers: WeiboHelperBag;
  rabbitMQService: RabbitMQService;
};

export abstract class WeiboBaseCleanTask extends BaseTask {
  protected getHelpers(context: CleanTaskContext): WeiboHelperBag {
    const helpers = context.helpers as WeiboHelperBag | undefined;
    if (!helpers || !helpers.weibo) {
      throw new Error('Weibo 清洗辅助服务不可用');
    }
    return helpers;
  }

  constructor(message: CleanTaskMessage) {
    super(message);
  }

  protected abstract handle(context: WeiboTaskContext): Promise<CleanTaskResult>;

  protected execute(context: CleanTaskContext): Promise<CleanTaskResult> {
    const helpers = this.getHelpers(context);
    const helpersRecord = context.helpers as Record<string, unknown>;
    const rabbitMQService = helpersRecord.rabbitMQ as RabbitMQService | undefined;

    if (!rabbitMQService) {
      throw new Error('RabbitMQ 服务不可用');
    }

    const scopedContext: WeiboTaskContext = {
      ...context,
      helpers,
      rabbitMQService,
    };
    return this.handle(scopedContext);
  }
}
