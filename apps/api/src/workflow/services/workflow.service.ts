import { Injectable, NotFoundException } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { WorkflowExecutionStatus } from '@pro/types';
import { WorkflowEntity, WorkflowExecutionEntity, useEntityManager } from '@pro/entities';
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

  async listWorkflows(filter?: WorkflowFilterInput): Promise<WorkflowEntity[]> {
    return useEntityManager(async (m) => {
      const query = m.getRepository(WorkflowEntity).createQueryBuilder('workflow');

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
    });
  }

  async getWorkflowById(id: string): Promise<WorkflowEntity | null> {
    return useEntityManager(async (m) => {
      return m.getRepository(WorkflowEntity).findOne({ where: { id } });
    });
  }

  async saveWorkflow(
    input: SaveWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowEntity> {
    return useEntityManager(async (m) => {
      const tags = input.tags?.filter(Boolean) ?? [];
      const definition = input.definition as unknown as NodeJsonPayload;
      const workflowRepo = m.getRepository(WorkflowEntity);

      if (input.id) {
        const existing = await workflowRepo.findOne({ where: { id: input.id } });
        if (!existing) {
          throw new NotFoundException(`Workflow ${input.id} 不存在。`);
        }

        existing.name = input.name;
        existing.slug = input.slug;
        existing.description = input.description ?? null;
        existing.tags = tags;
        existing.definition = definition;
        existing.updatedBy = actorId ?? existing.updatedBy ?? null;

        return workflowRepo.save(existing);
      }

      const entity = workflowRepo.create({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        tags,
        definition,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      });

      return workflowRepo.save(entity);
    });
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return useEntityManager(async (m) => {
      const result = await m.getRepository(WorkflowEntity).delete({ id });
      return (result.affected ?? 0) > 0;
    });
  }

  async cloneWorkflow(
    id: string,
    name: string,
    slug: string,
    actorId?: string | null,
  ): Promise<WorkflowEntity> {
    return useEntityManager(async (m) => {
      const workflowRepo = m.getRepository(WorkflowEntity);
      const original = await workflowRepo.findOne({ where: { id } });
      if (!original) {
        throw new NotFoundException(`Workflow ${id} 不存在，无法克隆。`);
      }

      const entity = workflowRepo.create({
        name,
        slug,
        description: original.description,
        tags: original.tags,
        definition: original.definition,
        createdBy: actorId ?? original.createdBy ?? null,
        updatedBy: actorId ?? original.updatedBy ?? null,
      });

      return workflowRepo.save(entity);
    });
  }

  async triggerWorkflow(
    input: TriggerWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowExecutionEntity> {
    return useEntityManager(async (m) => {
      const workflowRepo = m.getRepository(WorkflowEntity);
      const executionRepo = m.getRepository(WorkflowExecutionEntity);

      const workflow = await workflowRepo.findOne({ where: { id: input.workflowId } });
      if (!workflow) {
        throw new NotFoundException(`Workflow ${input.workflowId} 不存在。`);
      }

      const execution = executionRepo.create({
        workflowId: workflow.id,
        status: 'pending' as IAstStates,
        triggeredBy: actorId ?? 'system',
        context: input.context ?? null,
        metrics: null,
        logsPointer: null,
      });

      return executionRepo.save(execution);
    });
  }

  async listExecutions(
    workflowId: string,
    limit = 20,
    cursor?: string | null,
  ): Promise<WorkflowExecutionConnection> {
    return useEntityManager(async (m) => {
      const executionRepo = m.getRepository(WorkflowExecutionEntity);
      const where: Record<string, any> = { workflowId };
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (!Number.isNaN(cursorDate.valueOf())) {
          where.createdAt = LessThan(cursorDate);
        }
      }

      const records = await executionRepo.find({
        where,
        order: { createdAt: 'DESC' },
        take: limit + 1,
      });

      const totalCount = await executionRepo.count({ where: { workflowId } });

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
    });
  }

  private hasDefinitionChanged(
    previous: NodeJsonPayload,
    next: NodeJsonPayload,
  ): boolean {
    return JSON.stringify(previous) !== JSON.stringify(next);
  }
}
