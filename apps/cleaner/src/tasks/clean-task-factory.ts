import { Injectable } from '@nestjs/common';
import { SourceType } from '@pro/types';
import { BaseTask } from './base-task';
import { CleanTaskMessage } from './clean-task-message';
import { WeiboKeywordSearchCleanTask } from './weibo/weibo-keyword-search-clean-task';
import { WeiboCommentsCleanTask } from './weibo/weibo-comments-clean-task';
import { WeiboDetailCleanTask } from './weibo/weibo-detail-clean-task';
import { WeiboUserInfoCleanTask } from './weibo/weibo-user-info-clean-task';

@Injectable()
export class CleanTaskFactory {
  createTask(message: CleanTaskMessage): BaseTask {
    switch (message.sourceType) {
      case SourceType.WEIBO_KEYWORD_SEARCH:
        return new WeiboKeywordSearchCleanTask(message);
      case SourceType.WEIBO_COMMENTS:
        return new WeiboCommentsCleanTask(message);
      case SourceType.WEIBO_NOTE_DETAIL:
        return new WeiboDetailCleanTask(message);
      case SourceType.WEIBO_CREATOR_PROFILE:
        return new WeiboUserInfoCleanTask(message);
      default:
        throw new Error(`暂不支持的数据源类型: ${message.sourceType}`);
    }
  }
}
