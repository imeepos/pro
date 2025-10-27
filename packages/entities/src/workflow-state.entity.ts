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

/** AST 状态类型 */
export type IAstStates = 'pending' | 'running' | 'success' | 'fail';

/** 工作流运行时状态枚举 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  PAUSED = 'paused',
}

/** 将 AST 状态映射到 WorkflowStatus */
export function mapAstStateToWorkflowStatus(state: IAstStates): WorkflowStatus {
  const mapping: Record<IAstStates, WorkflowStatus> = {
    pending: WorkflowStatus.PENDING,
    running: WorkflowStatus.RUNNING,
    success: WorkflowStatus.SUCCESS,
    fail: WorkflowStatus.FAILED,
  };
  return mapping[state];
}

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
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.PENDING,
  })
  status: WorkflowStatus;

  /** 当前执行到的节点/步骤标识 */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'current_step' })
  currentStep: string | null;

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
