import { BaseTask, CleanTaskContext, CleanTaskResult } from '../base-task';
import { CleanTaskMessage } from '../clean-task-message';
import { WeiboPersistenceService } from '../../services/weibo-persistence.service';

interface WeiboHelperBag {
  weibo: WeiboPersistenceService;
}

export type WeiboTaskContext = CleanTaskContext & { helpers: WeiboHelperBag };

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
    const scopedContext: WeiboTaskContext = {
      ...context,
      helpers,
    };
    return this.handle(scopedContext);
  }
}
