/**
 * 关键词
 *
 * NLP 提取的关键术语,包含权重和类型标注
 */
export interface Keyword {
  /** 关键词文本 */
  text: string;

  /** 权重/重要性评分 [0, 1] */
  weight: number;

  /** 可选: 词性标注 */
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'other';

  /** 可选: 出现频次 */
  frequency?: number;
}

/**
 * 主题
 *
 * 文本的主题聚类结果
 */
export interface Topic {
  /** 主题ID - 用于主题追踪和关联 */
  id: string;

  /** 主题标签/名称 */
  label: string;

  /** 主题相关度评分 [0, 1] */
  relevance: number;

  /** 可选: 主题关键词 */
  keywords?: string[];

  /** 可选: 主题层级 (多级主题分类) */
  hierarchy?: string[];
}

/**
 * 实体
 *
 * 命名实体识别(NER)结果
 */
export interface Entity {
  /** 实体文本 */
  text: string;

  /** 实体类型 */
  type: 'person' | 'organization' | 'location' | 'product' | 'event' | 'other';

  /** 置信度 [0, 1] */
  confidence: number;

  /** 可选: 实体在原文中的位置 */
  positions?: Array<{
    start: number;
    end: number;
  }>;
}

/**
 * NLP 分析结果
 *
 * 完整的自然语言处理输出
 */
export interface NLPAnalysisResult {
  /** 关键词列表 - 按权重降序 */
  keywords: Keyword[];

  /** 主题列表 - 按相关度降序 */
  topics: Topic[];

  /** 可选: 命名实体列表 */
  entities?: Entity[];

  /** 可选: 文本摘要 (限制200字符) */
  summary?: string;

  /** 可选: 语言检测 */
  language?: string;

  /** 分析模型标识 */
  model: string;

  /** 分析时间戳 - ISO 8601 格式 */
  analyzedAt: string;
}
