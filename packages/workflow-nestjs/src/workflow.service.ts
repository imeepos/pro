import { Inject, Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';
import { useEntityManager, useTranslation } from '@pro/entities';
import { WorkflowEntity, WorkflowExecutionEntity, WorkflowStateEntity, WorkflowStatus } from '@pro/entities';
import { WorkflowExecutionStatus } from '@pro/types';
import { executeAst, fromJson, toJson, WorkflowGraphAst } from '@pro/workflow-core';
import { WorkflowDefinition } from '@pro/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 包含数据库元数据的 workflow 对象
 */
export interface WorkflowWithMetadata {
  /** workflow 业务对象 */
  workflow: WorkflowGraphAst;
  /** 数据库记录 UUID */
  id: string;
  /** workflow 名称 */
  name: string;
  /** slug 标识符 */
  slug: string;
  /** 描述信息 */
  description: string | null;
  /** 标签 */
  tags: string[];
}

@Injectable()
export class WorkflowService {
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) {}

  /**
   * 创建并持久化 workflow
   */
  async createWorkflow(
    name: string,
    definition: WorkflowGraphAst,
    options: {
      description?: string;
      tags?: string[];
      createdBy?: string;
    } = {}
  ): Promise<WorkflowEntity> {
    const workflowEntity = new WorkflowEntity();
    workflowEntity.id = uuidv4();
    workflowEntity.name = name;
    workflowEntity.slug = this.generateSlug(name);
    workflowEntity.description = options.description || null;
    workflowEntity.tags = options.tags || [];
    workflowEntity.definition = this.convertToWorkflowDefinition(definition);
    workflowEntity.createdBy = options.createdBy || null;

    return await useTranslation(async (manager) => {
      const savedWorkflow = await manager.save(workflowEntity);

      // 缓存到 Redis
      await this.redis.set(`workflow:${savedWorkflow.id}`, JSON.stringify(savedWorkflow.definition));
      await this.redis.set(`workflow:slug:${savedWorkflow.slug}`, JSON.stringify(savedWorkflow.definition));

      return savedWorkflow;
    });
  }

  /**
   * 更新 workflow 定义（单一版本模式）
   */
  async updateWorkflow(
    id: string,
    definition: WorkflowGraphAst,
    options: {
      description?: string;
      tags?: string[];
      updatedBy?: string;
    } = {}
  ): Promise<WorkflowEntity> {
    return await useTranslation(async (manager) => {
      const workflow = await manager.findOne(WorkflowEntity, { where: { id } });
      if (!workflow) {
        throw new Error(`Workflow with id ${id} not found`);
      }

      // 更新字段
      workflow.definition = this.convertToWorkflowDefinition(definition);
      if (options.description !== undefined) workflow.description = options.description;
      if (options.tags !== undefined) workflow.tags = options.tags;
      if (options.updatedBy !== undefined) workflow.updatedBy = options.updatedBy;

      const savedWorkflow = await manager.save(workflow);

      // 更新 Redis 缓存
      await this.redis.set(`workflow:${id}`, JSON.stringify(savedWorkflow.definition));
      await this.redis.set(`workflow:slug:${savedWorkflow.slug}`, JSON.stringify(savedWorkflow.definition));

      return savedWorkflow;
    });
  }

  /**
   * 根据 ID 获取 workflow
   */
  async getWorkflow(id: string): Promise<WorkflowGraphAst | null> {
    // 先从 Redis 缓存获取
    const cached = await this.redis.get(`workflow:${id}`);
    if (cached) {
      const workflowDefinition = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return this.convertFromWorkflowDefinition(workflowDefinition);
    }

    // Redis 没有则从数据库获取
    return await useEntityManager(async (manager) => {
      const workflow = await manager.findOne(WorkflowEntity, { where: { id } });

      if (!workflow) {
        return null;
      }

      // 缓存到 Redis
      await this.redis.set(`workflow:${id}`, JSON.stringify(workflow.definition));

      return this.convertFromWorkflowDefinition(workflow.definition);
    });
  }

  /**
   * 根据 slug 获取包含元数据的 workflow
   */
  async getWorkflowBySlug(slug: string): Promise<WorkflowWithMetadata | null> {
    return await useEntityManager(async (manager) => {
      const workflow = await manager.findOne(WorkflowEntity, { where: { slug } });

      if (!workflow) {
        return null;
      }

      // 缓存 workflow 定义到 Redis
      await this.redis.set(`workflow:slug:${slug}`, JSON.stringify(workflow.definition));
      await this.redis.set(`workflow:${workflow.id}`, JSON.stringify(workflow.definition));

      return {
        workflow: this.convertFromWorkflowDefinition(workflow.definition),
        id: workflow.id,
        name: workflow.name,
        slug: workflow.slug,
        description: workflow.description,
        tags: workflow.tags
      };
    });
  }

  /**
   * 执行 workflow 并记录执行历史和运行时状态
   */
  async executeWorkflow(
    workflowId: string,
    triggeredBy: string = 'system',
    context?: Record<string, unknown>
  ): Promise<{ execution: WorkflowExecutionEntity; state: WorkflowStateEntity; result: any }> {
    return await useTranslation(async (manager) => {
      // 创建执行记录
      const execution = new WorkflowExecutionEntity();
      execution.id = uuidv4();
      execution.workflowId = workflowId;
      execution.status = WorkflowExecutionStatus.RUNNING;
      execution.triggeredBy = triggeredBy;
      execution.context = context || null;

      const savedExecution = await manager.save(execution);

      // 创建运行时状态记录
      const state = new WorkflowStateEntity();
      state.id = uuidv4();
      state.executionId = savedExecution.id;
      state.status = WorkflowStatus.RUNNING;
      state.currentStep = null;
      state.metadata = context || {};

      const savedState = await manager.save(state);

      // 缓存运行时状态到 Redis（实时更新）
      await this.redis.set(`workflow:execution:state:${savedExecution.id}`, JSON.stringify({
        id: savedState.id,
        status: savedState.status,
        currentStep: savedState.currentStep,
        startedAt: savedState.createdAt
      }), 3600);

      try {
        // 获取并执行 workflow
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        console.log(`[WorkflowService] Starting execution of workflow ${workflowId}`);
        const result = await executeAst(workflow);
        console.log(`[WorkflowService] Workflow ${workflowId} executed successfully`);

        // 更新执行记录
        savedExecution.status = WorkflowExecutionStatus.SUCCEEDED;
        savedExecution.finishedAt = new Date();
        savedExecution.durationMs = Date.now() - savedExecution.startedAt.getTime();
        await manager.save(savedExecution);

        // 更新运行时状态
        savedState.status = WorkflowStatus.SUCCESS;
        savedState.completedAt = new Date();
        await manager.save(savedState);

        // 缓存执行结果
        await this.redis.set(`workflow:execution:${savedExecution.id}`, JSON.stringify({
          status: savedExecution.status,
          result,
          duration: savedExecution.durationMs
        }), 3600);

        // 更新状态缓存
        await this.redis.set(`workflow:execution:state:${savedExecution.id}`, JSON.stringify({
          id: savedState.id,
          status: savedState.status,
          completedAt: savedState.completedAt
        }), 3600);

        return { execution: savedExecution, state: savedState, result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[WorkflowService] Workflow ${workflowId} execution failed:`, errorMessage);

        // 更新执行记录为失败
        savedExecution.status = WorkflowExecutionStatus.FAILED;
        savedExecution.finishedAt = new Date();
        savedExecution.durationMs = Date.now() - savedExecution.startedAt.getTime();
        await manager.save(savedExecution);

        // 更新运行时状态为失败
        savedState.status = WorkflowStatus.FAILED;
        savedState.errorMessage = errorMessage;
        savedState.completedAt = new Date();
        await manager.save(savedState);

        // 缓存错误信息
        await this.redis.set(`workflow:execution:${savedExecution.id}`, JSON.stringify({
          status: savedExecution.status,
          error: errorMessage,
          duration: savedExecution.durationMs
        }), 3600);

        await this.redis.set(`workflow:execution:state:${savedExecution.id}`, JSON.stringify({
          id: savedState.id,
          status: savedState.status,
          error: errorMessage,
          completedAt: savedState.completedAt
        }), 3600);

        throw new Error(`Workflow execution failed: ${errorMessage}`);
      }
    });
  }

  /**
   * 获取执行实例的运行时状态
   */
  async getExecutionState(executionId: string): Promise<WorkflowStateEntity | null> {
    // 先从 Redis 缓存获取
    const cached = await this.redis.get(`workflow:execution:state:${executionId}`);
    if (cached) {
      const stateData = typeof cached === 'string' ? JSON.parse(cached) : cached;
      // Redis 中只存储了部分字段，需要从数据库获取完整数据
      if (stateData.status === WorkflowStatus.RUNNING) {
        return await useEntityManager(async (manager) => {
          return await manager.findOne(WorkflowStateEntity, {
            where: { id: stateData.id }
          });
        });
      }
    }

    // 从数据库获取状态
    return await useEntityManager(async (manager) => {
      return await manager.findOne(WorkflowStateEntity, {
        where: { executionId }
      });
    });
  }

  /**
   * 获取执行历史
   */
  async getExecutionHistory(workflowId: string, limit: number = 10): Promise<WorkflowExecutionEntity[]> {
    return await useEntityManager(async (manager) => {
      return await manager.find(WorkflowExecutionEntity, {
        where: { workflowId },
        order: { createdAt: 'DESC' },
        take: limit
      });
    });
  }

  /**
   * 生成友好的slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }

  /**
   * 将WorkflowGraphAst转换为WorkflowDefinition
   */
  private convertToWorkflowDefinition(workflow: WorkflowGraphAst): WorkflowDefinition {
    return {
      version: 1,
      nodes: workflow.nodes.map(node => ({
        id: node.id,
        key: node.type,
        title: node.type, // 可以从node的其他属性获取更好的标题
        kind: node.type as any, // 需要根据实际的WorkflowNodeKind映射
        config: {
          schema: {},
          values: toJson(node)
        },
        metadata: {}
      })),
      edges: workflow.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        sourceId: edge.from,
        targetId: edge.to,
        sourcePort: edge.fromProperty || null,
        targetPort: edge.toProperty || null
      }))
    };
  }

  /**
   * 从WorkflowDefinition重建WorkflowGraphAst
   */
  private convertFromWorkflowDefinition(definition: WorkflowDefinition): WorkflowGraphAst {
    const workflow = new WorkflowGraphAst();

    // 重建nodes
    definition.nodes.forEach(nodeDef => {
      const node = fromJson(nodeDef.config.values);
      workflow.addNode(node);
    });

    // 重建edges
    definition.edges.forEach(edgeDef => {
      if (edgeDef.sourcePort && edgeDef.targetPort) {
        workflow.addEdge({
          from: edgeDef.sourceId,
          to: edgeDef.targetId,
          fromProperty: edgeDef.sourcePort,
          toProperty: edgeDef.targetPort
        });
      } else {
        workflow.addEdge({
          from: edgeDef.sourceId,
          to: edgeDef.targetId
        });
      }
    });

    return workflow;
  }
}