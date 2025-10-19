/**
 * 情感类型
 *
 * 三分类情感标注,平衡精度与实用性
 */
export enum SentimentType {
  /** 正面情感 */
  POSITIVE = 'positive',

  /** 负面情感 */
  NEGATIVE = 'negative',

  /** 中性情感 */
  NEUTRAL = 'neutral',
}

/**
 * 情感得分
 *
 * 连续值情感评估,范围 [-1, 1]
 * -1: 极度负面, 0: 中性, 1: 极度正面
 */
export interface SentimentScore {
  /** 情感类型分类 */
  type: SentimentType;

  /** 情感得分 */
  score: number;

  /** 置信度 [0, 1] */
  confidence: number;
}

/**
 * 情感分析结果
 *
 * 完整的情感分析输出,包含细粒度情感维度
 */
export interface SentimentAnalysisResult {
  /** 整体情感 */
  overall: SentimentScore;

  /** 可选: 情感维度分解 (细粒度分析) */
  dimensions?: {
    /** 喜悦程度 [0, 1] */
    joy?: number;

    /** 愤怒程度 [0, 1] */
    anger?: number;

    /** 悲伤程度 [0, 1] */
    sadness?: number;

    /** 恐惧程度 [0, 1] */
    fear?: number;

    /** 惊讶程度 [0, 1] */
    surprise?: number;
  };

  /** 分析模型标识 */
  model: string;

  /** 分析时间戳 - ISO 8601 格式 */
  analyzedAt: string;
}
