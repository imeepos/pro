import {
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { WorkflowDefinition } from '@pro/types';
import { WorkflowExecutionEntity } from './workflow-execution.entity.js';
import { Entity } from './decorator.js';

@Entity('workflow')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  @Column({ type: 'integer', default: 1 })
  revision!: number;

  @Column({ type: 'jsonb' })
  definition!: WorkflowDefinition;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'created_by' })
  createdBy!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => WorkflowExecutionEntity, (execution) => execution.workflow, {
    cascade: false,
  })
  executions!: WorkflowExecutionEntity[];
}
