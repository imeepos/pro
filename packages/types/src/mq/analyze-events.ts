/**
 * 分析类型
 *
 * 每种分析类型对应不同的算法和资源消耗
 */
export enum AnalysisType {
  /** 情感分析 - 快速,低成本 */
  SENTIMENT = 'sentiment',

  /** NLP分析 - 关键词/主题提取,中等成本 */
  NLP = 'nlp',

  /** LLM分析 - 深度语义理解,高成本 */
  LLM = 'llm',
}

/**
 * 数据类型
 *
 * 标识待分析数据的实体类型
 */
export enum DataType {
  /** 帖子/微博 */
  POST = 'post',

  /** 评论 */
  COMMENT = 'comment',

  /** 用户 */
  USER = 'user',
}

/**
 * 分析任务事件
 *
 * 触发 Analyzer 对指定数据进行分析
 * 可由 Cleaner 自动触发,或由 System 批量触发
 *
 * 设计原则:
 * - 支持多类型分析并行,提高灵活性
 * - 通过 analysisTypes 数组避免重复任务创建
 */
export interface AnalyzeTaskEvent {
  /** 数据ID - 对应 PostgreSQL 中的实体ID */
  dataId: string;

  /** 数据类型 - 决定分析策略 */
  dataType: DataType;

  /** 需要执行的分析类型列表 */
  analysisTypes: AnalysisType[];

  /** 可选: 分析配置 */
  config?: {
    /** LLM 模型选择 */
    llmModel?: 'gpt-4' | 'claude-3' | 'qwen';

    /** 是否启用缓存 */
    enableCache?: boolean;

    /** 批处理大小 (批量分析场景) */
    batchSize?: number;
  };

  /** 可选: 业务上下文 */
  context?: {
    /** 关联任务ID */
    taskId?: number;

    /** 关键词 (微博搜索场景) */
    keyword?: string;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}

/**
 * 分析结果事件
 *
 * Analyzer 完成分析后发布,结果已存储到 PostgreSQL
 * 触发 Aggregator 进行数据聚合
 *
 * 设计原则:
 * - results 提供结果概览,完整数据已在数据库中
 * - 使用 Map 结构支持多类型分析结果
 */
export interface AnalysisResultEvent {
  /** 分析结果ID - PostgreSQL 分析记录主键 */
  analysisId: string;

  /** 源数据ID - 追溯被分析的数据 */
  dataId: string;

  /** 数据类型 */
  dataType: DataType;

  /** 分析结果概览 - 轻量级摘要 */
  results: {
    /** 情感分析结果 */
    sentiment?: {
      /** 情感类型 */
      type: 'positive' | 'negative' | 'neutral';

      /** 情感得分 [-1, 1] */
      score: number;
    };

    /** NLP 分析结果 */
    nlp?: {
      /** 关键词列表 (最多10个) */
      keywords: string[];

      /** 主题列表 (最多5个) */
      topics: string[];
    };

    /** LLM 分析结果 */
    llm?: {
      /** 摘要 (限制100字符) */
      summary: string;

      /** 分类标签 */
      categories: string[];
    };
  };

  /** 统计信息 */
  stats: {
    /** 分析耗时(毫秒) */
    processingTimeMs: number;

    /** API调用成本 (LLM场景,单位:分) */
    apiCostCents?: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}
