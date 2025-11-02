import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowExecutionEntity } from './workflow-execution.entity.js';
import { Entity } from './decorator.js';
import { type IAstStates } from '@pro/workflow-core'


/**
 * 工作流运行时状态实体
 * 追踪正在执行的工作流的实时进度和中间状态
 * 用途：进度监控、暂停/恢复、重试机制
 */
@Entity('workflow_states')
@Index(['executionId'])
@Index(['status'])
export class WorkflowStateEntity {
  /** 状态记录唯一标识 */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联的执行记录 ID（一对一关系） */
  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  /** 当前运行状态 */
  @Column({
    type: 'varchar',
    default: `pending`
  })
  status: IAstStates;

  /** 执行进度百分比 (0-100) */
  @Column({ type: 'int', default: 0 })
  progress: number;

  /** 运行时元数据：存储整个 WorkflowGraphAst 的 toJson 序列化结果 */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  /** 错误信息（状态为 FAILED 时） */
  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  /** 重试次数（失败后自动重试） */
  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  /** 创建时间 */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /** 更新时间（每次状态变化） */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  /** 完成时间（成功或失败时） */
  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  /** 一对一关联到执行记录 */
  @OneToOne(() => WorkflowExecutionEntity, (execution) => execution.state, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'execution_id' })
  execution: WorkflowExecutionEntity;
}
