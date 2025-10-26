/**
 * 工作流事件定义
 *
 * 存在即合理: 工作流完成后发布事件,触发下游处理
 * 优雅即简约: 事件结构精简,仅传递必要信息
 */

/**
 * 微博详情工作流完成事件
 *
 * PostDetailWorkflow 执行完成后发布
 * 触发: 数据分析、用户画像补充等下游任务
 */
export interface PostDetailCompletedEvent {
  /** 微博ID */
  postId: string;

  /** 作者ID (用于触发用户画像采集) */
  authorId?: string;

  /** MongoDB RawData 文档 ID */
  rawDataId: string;

  /** 元数据 - 提供上下文信息 */
  metadata?: {
    /** 关联的搜索关键词 */
    keyword?: string;

    /** 关联的主任务ID */
    taskId?: number;

    /** 评论数 */
    commentCount?: number;

    /** 点赞数 */
    likeCount?: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}

/**
 * 用户画像工作流完成事件
 *
 * UserProfileWorkflow 执行完成后发布
 * 触发: 异常账号告警、用户聚类分析等下游任务
 */
export interface UserProfileCompletedEvent {
  /** 用户ID */
  userId: string;

  /** MongoDB RawData 文档 ID */
  rawDataId: string;

  /** 机器人嫌疑 */
  isBotSuspect: boolean;

  /** 垃圾账号嫌疑 */
  isSpammerSuspect: boolean;

  /** 行为评分 - 量化检测置信度 */
  behaviorScore: {
    /** 机器人置信度 0-100 */
    botConfidence: number;

    /** 水军置信度 0-100 */
    spamConfidence: number;
  };

  /** 元数据 - 提供上下文信息 */
  metadata?: {
    /** 数据来源 */
    source?: 'post-author' | 'commenter' | 'liker';

    /** 关联的微博ID (如果是从评论/点赞中发现) */
    relatedPostId?: string;

    /** 关联的主任务ID */
    taskId?: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}
