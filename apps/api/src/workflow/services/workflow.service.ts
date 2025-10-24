import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { WorkflowDefinition, WorkflowExecutionStatus } from '@pro/types';
import { WorkflowEntity, WorkflowExecutionEntity } from '@pro/entities';
import { SaveWorkflowInput } from '../dto/save-workflow.input';
import { WorkflowFilterInput } from '../dto/workflow-filter.input';
import { TriggerWorkflowInput } from '../dto/trigger-workflow.input';

interface WorkflowExecutionConnection {
  edges: Array<{ cursor: string; node: WorkflowExecutionEntity }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowExecutionEntity)
    private readonly executionRepository: Repository<WorkflowExecutionEntity>,
  ) {}

  async listWorkflows(filter?: WorkflowFilterInput): Promise<WorkflowEntity[]> {
    const query = this.workflowRepository.createQueryBuilder('workflow');

    if (filter?.search) {
      query.andWhere(
        '(workflow.name ILIKE :search OR workflow.slug ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter?.tag) {
      query.andWhere(':tag = ANY(workflow.tags)', { tag: filter.tag });
    }

    query.orderBy('workflow.updatedAt', 'DESC');

    return query.getMany();
  }

  async getWorkflowById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({ where: { id } });
  }

  async saveWorkflow(
    input: SaveWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowEntity> {
    const tags = input.tags?.filter(Boolean) ?? [];
    const definition = input.definition as unknown as WorkflowDefinition;

    if (input.id) {
      const existing = await this.workflowRepository.findOne({ where: { id: input.id } });
      if (!existing) {
        throw new NotFoundException(`Workflow ${input.id} 不存在。`);
      }

      const shouldBumpRevision = this.hasDefinitionChanged(
        existing.definition,
        definition,
      );

      existing.name = input.name;
      existing.slug = input.slug;
      existing.description = input.description ?? null;
      existing.tags = tags;
      existing.definition = definition;
      existing.updatedBy = actorId ?? existing.updatedBy ?? null;
      existing.revision = shouldBumpRevision ? existing.revision + 1 : existing.revision;

      return this.workflowRepository.save(existing);
    }

    const entity = this.workflowRepository.create({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      tags,
      definition,
      revision: 1,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    });

    return this.workflowRepository.save(entity);
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const result = await this.workflowRepository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async cloneWorkflow(
    id: string,
    name: string,
    slug: string,
    actorId?: string | null,
  ): Promise<WorkflowEntity> {
    const original = await this.workflowRepository.findOne({ where: { id } });
    if (!original) {
      throw new NotFoundException(`Workflow ${id} 不存在，无法克隆。`);
    }

    const entity = this.workflowRepository.create({
      name,
      slug,
      description: original.description,
      tags: original.tags,
      definition: original.definition,
      revision: 1,
      createdBy: actorId ?? original.createdBy ?? null,
      updatedBy: actorId ?? original.updatedBy ?? null,
    });

    return this.workflowRepository.save(entity);
  }

  async triggerWorkflow(
    input: TriggerWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowExecutionEntity> {
    const workflow = await this.workflowRepository.findOne({ where: { id: input.workflowId } });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${input.workflowId} 不存在。`);
    }

    const revision = input.revision ?? workflow.revision;

    const execution = this.executionRepository.create({
      workflowId: workflow.id,
      revision,
      status: WorkflowExecutionStatus.QUEUED,
      triggeredBy: actorId ?? 'system',
      context: input.context ?? null,
      metrics: null,
      logsPointer: null,
    });

    return this.executionRepository.save(execution);
  }

  async listExecutions(
    workflowId: string,
    limit = 20,
    cursor?: string | null,
  ): Promise<WorkflowExecutionConnection> {
    const where: Record<string, any> = { workflowId };
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.valueOf())) {
        where.createdAt = LessThan(cursorDate);
      }
    }

    const records = await this.executionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit + 1,
    });

    const totalCount = await this.executionRepository.count({ where: { workflowId } });

    const hasNextPage = records.length > limit;
    const items = hasNextPage ? records.slice(0, limit) : records;

    const edges = items.map((node) => ({
      cursor: node.createdAt.toISOString(),
      node,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: Boolean(cursor),
        startCursor: edges.at(0)?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
      totalCount,
    };
  }

  private hasDefinitionChanged(
    previous: WorkflowDefinition,
    next: WorkflowDefinition,
  ): boolean {
    return JSON.stringify(previous) !== JSON.stringify(next);
  }
}
