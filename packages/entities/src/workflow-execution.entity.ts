import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { WorkflowExecutionMetrics } from '@pro/types';
import { WorkflowEntity } from './workflow.entity.js';
import { WorkflowStateEntity } from './workflow-state.entity.js';
import { Entity } from './decorator.js';
import { type IAstStates } from '@pro/workflow-core'

@Entity('workflow_execution')
export class WorkflowExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId!: string;

  @Index()
  @Column({
    type: 'varchar',
    default: `pending`
  })
  status!: IAstStates;

  @Column({
    type: 'timestamptz',
    name: 'started_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt!: Date;

  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'integer', name: 'duration_ms', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'varchar', length: 128, name: 'triggered_by' })
  triggeredBy!: string;

  @Column({ type: 'jsonb', nullable: true })
  context!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metrics!: WorkflowExecutionMetrics | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'logs_pointer' })
  logsPointer!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.executions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: WorkflowEntity;

  @OneToOne(() => WorkflowStateEntity, (state) => state.execution)
  state!: WorkflowStateEntity;
}
