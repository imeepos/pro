/**
 * 模型提供商 - AI智慧的不同化身
 */
export enum ModelProvider {
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  BAIDU = 'baidu',
  INTERNAL = 'internal'
}

/**
 * 分析模型配置 - 每个模型的独特标识
 */
export interface AnalysisModelConfig {
  provider: ModelProvider;
  modelName: string;
  version: string;
  capabilities: AnalysisCapability[];
  temperature?: number;
  maxTokens?: number;
  customConfig?: Record<string, unknown>;
}

/**
 * 分析能力枚举 - 定义模型的专长领域
 */
export enum AnalysisCapability {
  SENTIMENT = 'sentiment',
  ENTITY_EXTRACTION = 'entity_extraction',
  TOPIC_MODELING = 'topic_modeling',
  REASONING = 'reasoning',
  SUMMARIZATION = 'summarization',
  CLASSIFICATION = 'classification',
  INTENT_DETECTION = 'intent_detection',
  CODE_ANALYSIS = 'code_analysis',
  MATHEMATICAL_REASONING = 'mathematical_reasoning'
}

export interface SentimentAnalysisResult {
  score: number;
  confidence: number;
  label: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  emotions?: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  polarity: {
    positive: number;
    negative: number;
    neutral: number;
  };
  /** 模型来源标识 */
  modelSource?: AnalysisModelConfig;
}

export interface NLPAnalysisResult {
  keywords: Array<{
    word: string;
    weight: number;
    pos?: string;
  }>;
  topics: Array<{
    name: string;
    confidence: number;
    keywords: string[];
  }>;
  entities: Array<{
    type: 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'DATE' | 'TIME' | 'URL' | 'MENTION' | 'HASHTAG' | 'OTHER';
    value: string;
    confidence: number;
    startIndex?: number;
    endIndex?: number;
  }>;
  language: {
    detected: string;
    confidence: number;
  };
  summary?: {
    keyPhrases: string[];
    textLength: number;
    readability: number;
  };
  /** 模型来源标识 */
  modelSource?: AnalysisModelConfig;
}

/**
 * 推理类型 - DeepSeek 的思维模式
 */
export enum ReasoningType {
  LOGICAL = 'logical',
  CREATIVE = 'creative',
  ANALYTICAL = 'analytical',
  CAUSAL = 'causal',
  INDUCTIVE = 'inductive',
  DEDUCTIVE = 'deductive'
}

/**
 * 深度分析洞察 - 超越表面的智慧
 */
export interface DeepInsight {
  category: string;
  insight: string;
  confidence: number;
  evidences: string[];
  reasoning: ReasoningType;
  implications?: string[];
}

/**
 * LLM分析结果 - 大模型智慧的结晶
 */
export interface LLMAnalysisResult {
  status: 'completed' | 'not_implemented' | 'error';
  summary?: string;
  insights?: string[];
  intentions?: Array<{
    type: string;
    confidence: number;
    description: string;
  }>;
  complexity: {
    level: 'simple' | 'moderate' | 'complex';
    score: number;
  };
  /** DeepSeek 特有的深度洞察 */
  deepInsights?: DeepInsight[];
  /** 推理链路 - 思维的轨迹 */
  reasoningChain?: Array<{
    step: number;
    thought: string;
    confidence: number;
    type: ReasoningType;
  }>;
  /** 不确定性量化 */
  uncertainty?: {
    overall: number;
    sources: Array<{
      factor: string;
      impact: number;
    }>;
  };
  errorMessage?: string;
  processingTimeMs?: number;
  /** 模型来源标识 */
  modelSource?: AnalysisModelConfig;
}

/**
 * 综合分析结果 - 多维度智慧的融合
 */
export interface ComprehensiveAnalysisResult {
  sessionId: string;
  dataId: number;
  dataType: 'post' | 'comment' | 'user';
  analysisTimestamp: Date;

  /** 各维度分析结果 */
  sentiment?: SentimentAnalysisResult;
  nlp?: NLPAnalysisResult;
  llm?: LLMAnalysisResult;

  /** 跨模型的融合分析 */
  synthesis?: {
    overallConfidence: number;
    consensusMetrics: Record<string, number>;
    conflictingFindings?: Array<{
      metric: string;
      values: Array<{
        source: ModelProvider;
        value: unknown;
        confidence: number;
      }>;
    }>;
  };

  /** 质量评估 */
  qualityMetrics?: {
    completeness: number;
    consistency: number;
    reliability: number;
  };
}

/**
 * 分析任务配置 - 定义分析的意图与范围
 */
export interface AnalysisTaskConfig {
  taskId: string;
  targetCapabilities: AnalysisCapability[];
  modelPreferences: Array<{
    provider: ModelProvider;
    priority: number;
    fallbackOptions?: ModelProvider[];
  }>;
  qualityThresholds: {
    minConfidence: number;
    maxProcessingTime: number;
    requireConsensus?: boolean;
  };
  customInstructions?: string;
}
