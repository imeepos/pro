import { Injectable, NotFoundException } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { WorkflowEntity, WorkflowExecutionEntity, useEntityManager } from '@pro/entities';
import { SaveWorkflowInput } from '../dto/save-workflow.input';
import { WorkflowFilterInput } from '../dto/workflow-filter.input';
import { TriggerWorkflowInput } from '../dto/trigger-workflow.input';
import { WorkflowModel, WorkflowExecutionModel, WorkflowExecutionConnectionModel } from '../models';

@Injectable()
export class WorkflowService {

  private mapEntityToModel(entity: WorkflowEntity): WorkflowModel {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      tags: entity.tags,
      definition: {
        version: 1,
        nodes: [],
        edges: []
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
    };
  }

  private mapExecutionEntityToModel(entity: WorkflowExecutionEntity): WorkflowExecutionModel {
    return {
      id: entity.id,
      workflowId: entity.workflowId,
      status: entity.status as any,
      startedAt: entity.startedAt,
      finishedAt: entity.finishedAt,
      triggeredBy: entity.triggeredBy,
      context: entity.context,
      metrics: entity.metrics,
      logsPointer: entity.logsPointer,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async listWorkflows(filter?: WorkflowFilterInput): Promise<WorkflowModel[]> {
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

      const entities = await query.getMany();
      return entities.map(entity => this.mapEntityToModel(entity));
    });
  }

  async getWorkflowById(id: string): Promise<WorkflowModel | null> {
    return useEntityManager(async (m) => {
      const entity = await m.getRepository(WorkflowEntity).findOne({ where: { id } });
      return entity ? this.mapEntityToModel(entity) : null;
    });
  }

  async saveWorkflow(
    input: SaveWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowModel> {
    return useEntityManager(async (m) => {
      const tags = input.tags?.filter(Boolean) ?? [];
      const definition = input.definition as any;
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

        return this.mapEntityToModel(await workflowRepo.save(existing));
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

      return this.mapEntityToModel(await workflowRepo.save(entity));
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
  ): Promise<WorkflowModel> {
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

      return this.mapEntityToModel(await workflowRepo.save(entity));
    });
  }

  async triggerWorkflow(
    input: TriggerWorkflowInput,
    actorId?: string | null,
  ): Promise<WorkflowExecutionModel> {
    return useEntityManager(async (m) => {
      const workflowRepo = m.getRepository(WorkflowEntity);
      const executionRepo = m.getRepository(WorkflowExecutionEntity);

      const workflow = await workflowRepo.findOne({ where: { id: input.workflowId } });
      if (!workflow) {
        throw new NotFoundException(`Workflow ${input.workflowId} 不存在。`);
      }

      const execution = executionRepo.create({
        workflowId: workflow.id,
        status: 'pending' as any,
        triggeredBy: actorId ?? 'system',
        context: input.context ?? null,
        metrics: null,
        logsPointer: null,
      });

      return this.mapExecutionEntityToModel(await executionRepo.save(execution));
    });
  }

  async listExecutions(
    workflowId: string,
    limit = 20,
    cursor?: string | null,
  ): Promise<WorkflowExecutionConnectionModel> {
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
        node: this.mapExecutionEntityToModel(node),
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
}
