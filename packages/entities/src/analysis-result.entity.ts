import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SentimentAnalysisResult, NLPAnalysisResult, LLMAnalysisResult } from './types/analysis-types.js';

@Entity('analysis_results')
@Index(['dataId', 'dataType'])
@Index(['createdAt'])
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
    return this.nlpResult?.keywords || this.sentimentResult?.keywords || [];
  }
}
