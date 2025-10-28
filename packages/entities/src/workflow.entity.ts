import {
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowExecutionEntity } from './workflow-execution.entity.js';
import { Entity } from './decorator.js';
import { type NodeJsonPayload } from '@pro/workflow-core';

/**
 * 工作流定义实体
 * 存储工作流的元数据、配置和版本历史
 */
@Entity('workflow')
export class WorkflowEntity {
  /** 工作流唯一标识符 */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 工作流显示名称 */
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** URL 友好的唯一标识，用于路由和引用 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug!: string;

  /** 工作流描述，用于文档和展示 */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 分类标签，便于检索和组织 */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  /** 工作流核心定义：节点、边、配置 */
  @Column({ type: 'jsonb' })
  definition!: NodeJsonPayload;

  /** 创建者标识 */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'created_by' })
  createdBy!: string | null;

  /** 最后修改者标识 */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  /** 创建时间 */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /** 更新时间 */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  /** 该工作流的所有执行记录 */
  @OneToMany(() => WorkflowExecutionEntity, (execution) => execution.workflow, {
    cascade: false,
  })
  executions!: WorkflowExecutionEntity[];
}
