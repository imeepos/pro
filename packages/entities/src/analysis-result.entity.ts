import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  SentimentAnalysisResult,
  NLPAnalysisResult,
  LLMAnalysisResult,
  ComprehensiveAnalysisResult,
  ModelProvider,
  AnalysisModelConfig
} from './types/analysis-types.js';

@Entity('analysis_results')
@Index(['dataId', 'dataType'])
@Index(['createdAt'])
@Index(['sessionId'])
@Index(['primaryModelProvider'])
@Index(['qualityScore'])
export class AnalysisResultEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'data_id' })
  dataId: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'data_type',
  })
  dataType: 'post' | 'comment' | 'user';

  @Column({ type: 'jsonb', nullable: true, name: 'sentiment_result' })
  sentimentResult: SentimentAnalysisResult | null;

  @Column({ type: 'jsonb', nullable: true, name: 'nlp_result' })
  nlpResult: NLPAnalysisResult | null;

  @Column({ type: 'jsonb', nullable: true, name: 'llm_result' })
  llmResult: LLMAnalysisResult | null;

  /** 分析会话标识 - 跟踪分析的完整上下文 */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'session_id' })
  sessionId: string | null;

  /** 主要模型提供商 - 记录此次分析的主导AI */
  @Column({
    type: 'enum',
    enum: ModelProvider,
    nullable: true,
    name: 'primary_model_provider'
  })
  primaryModelProvider: ModelProvider | null;

  /** 模型配置快照 - 保存分析时的模型设置 */
  @Column({ type: 'jsonb', nullable: true, name: 'model_configs' })
  modelConfigs: AnalysisModelConfig[] | null;

  /** 分析质量评分 - 0-100的质量指标 */
  @Column({ type: 'smallint', nullable: true, name: 'quality_score' })
  qualityScore: number | null;

  /** 处理耗时 - 毫秒为单位 */
  @Column({ type: 'int', nullable: true, name: 'processing_time_ms' })
  processingTimeMs: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  get hasAnyAnalysis(): boolean {
    return !!(this.sentimentResult || this.nlpResult || this.llmResult);
  }

  get sentimentLabel(): string | null {
    return this.sentimentResult?.label || null;
  }

  get primaryKeywords(): string[] {
    if (this.nlpResult?.keywords) {
      return this.nlpResult.keywords.map(kw => kw.word);
    }
    return this.sentimentResult?.keywords || [];
  }

  /** 获取分析的整体可信度 - 融合各维度的置信度 */
  get overallConfidence(): number {
    const confidences: number[] = [];

    if (this.sentimentResult?.confidence) {
      confidences.push(this.sentimentResult.confidence);
    }
    if (this.nlpResult?.language?.confidence) {
      confidences.push(this.nlpResult.language.confidence);
    }
    if (this.llmResult?.uncertainty) {
      confidences.push(1 - this.llmResult.uncertainty.overall);
    }

    return confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0;
  }

  /** 检查是否为高质量分析结果 */
  get isHighQuality(): boolean {
    return (this.qualityScore ?? 0) >= 80 && this.overallConfidence >= 0.8;
  }

  /** 获取主要使用的模型信息 */
  get primaryModelInfo(): string | null {
    if (!this.primaryModelProvider) return null;

    const primaryConfig = this.modelConfigs?.find(
      config => config.provider === this.primaryModelProvider
    );

    return primaryConfig
      ? `${primaryConfig.provider}/${primaryConfig.modelName}@${primaryConfig.version}`
      : this.primaryModelProvider;
  }

  /** DeepSeek专属：获取深度洞察摘要 */
  get deepInsightsSummary(): string[] {
    if (this.primaryModelProvider !== ModelProvider.DEEPSEEK) {
      return [];
    }

    return this.llmResult?.deepInsights?.map(insight => insight.insight) || [];
  }

  /** 构建综合分析结果 */
  toComprehensiveResult(): ComprehensiveAnalysisResult {
    return {
      sessionId: this.sessionId || `session_${this.id}`,
      dataId: this.dataId,
      dataType: this.dataType,
      analysisTimestamp: this.createdAt,
      sentiment: this.sentimentResult || undefined,
      nlp: this.nlpResult || undefined,
      llm: this.llmResult || undefined,
      qualityMetrics: {
        completeness: this.hasAnyAnalysis ? 1 : 0,
        consistency: this.overallConfidence,
        reliability: (this.qualityScore ?? 0) / 100
      }
    };
  }
}
