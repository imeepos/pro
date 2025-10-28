import { Inject, Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';
import { useEntityManager, useTranslation } from '@pro/entities';
import { WorkflowEntity, WorkflowExecutionEntity, WorkflowStateEntity } from '@pro/entities';
import { executeAst, fromJson, NodeJsonPayload, toJson, WorkflowGraphAst } from '@pro/workflow-core';
import { WorkflowExecutionMetrics } from '@pro/types';
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
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) { }

  /**
   * 从 WorkflowGraphAst 计算执行指标
   */
  private calculateMetrics(ast: WorkflowGraphAst): {
    metrics: WorkflowExecutionMetrics;
    progress: number;
  } {
    const nodes = ast.nodes || [];
    const totalNodes = nodes.length;
    const succeededNodes = nodes.filter((n: any) => n.state === 'success').length;
    const failedNodes = nodes.filter((n: any) => n.state === 'fail').length;
    const completedNodes = succeededNodes + failedNodes;

    const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    return {
      metrics: {
        totalNodes,
        succeededNodes,
        failedNodes,
        throughput: null,
        payloadSize: null,
      },
      progress,
    };
  }

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
    console.log(`[WorkflowService] getWorkflowBySlug called with slug: ${slug}`);
    console.log(`[WorkflowService] Calling useEntityManager...`);
    return await useEntityManager(async (manager) => {
      console.log(`[WorkflowService] Inside useEntityManager callback`);
      const workflow = await manager.findOne(WorkflowEntity, { where: { slug } });
      console.log(`[WorkflowService] findOne result:`, workflow ? 'found' : 'not found');

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
      execution.status = 'running';
      execution.triggeredBy = triggeredBy;
      execution.context = context || null;

      const savedExecution = await manager.save(execution);

      // 创建运行时状态记录
      const state = new WorkflowStateEntity();
      state.id = uuidv4();
      state.executionId = savedExecution.id;
      state.status = 'running';
      state.metadata = {};

      const savedState = await manager.save(state);

      // 缓存运行时状态到 Redis（实时更新）
      await this.redis.set(`workflow:execution:state:${savedExecution.id}`, JSON.stringify({
        id: savedState.id,
        status: savedState.status,
        startedAt: savedState.createdAt
      }), 3600);

      // 获取 workflow 定义
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // 定义在外部作用域，以便错误处理时可以访问
      let currentWorkflow = workflow;

      try {
        console.log(`[WorkflowService] Starting execution of workflow ${workflowId}`);
        console.log(`[WorkflowService] Initial workflow state: ${currentWorkflow.state}`);
        console.log(`[WorkflowService] Workflow nodes:`, currentWorkflow.nodes.map(n => ({ id: n.id, type: n.type, state: n.state })));

        // 循环执行工作流，每次迭代后更新数据库状态
        console.log(`[WorkflowService] Entering execution loop...`);
        while (currentWorkflow.state === 'pending' || currentWorkflow.state === 'running') {
          console.log(`[WorkflowService] Loop iteration, state: ${currentWorkflow.state}`);
          currentWorkflow = await executeAst(currentWorkflow);
          console.log(`[WorkflowService] Iteration complete, new state: ${currentWorkflow.state}`);

          // 每次执行后计算并更新状态
          const { progress } = this.calculateMetrics(currentWorkflow);

          savedState.metadata = toJson(currentWorkflow);
          savedState.status = currentWorkflow.state;
          savedState.progress = progress;

          // 实时更新到数据库
          await manager.save(savedState);

          console.log(`[WorkflowService] Progress: ${progress}%, status: ${currentWorkflow.state}`);
        }

        const result = currentWorkflow;
        console.log(`[WorkflowService] Workflow ${workflowId} executed successfully`);

        // 计算最终指标
        const { metrics } = this.calculateMetrics(result);

        // 最终状态保存
        savedState.completedAt = new Date();
        await manager.save(savedState);

        // 更新执行记录
        savedExecution.status = result.state;
        savedExecution.metrics = metrics;
        savedExecution.finishedAt = new Date();
        savedExecution.durationMs = Date.now() - savedExecution.startedAt.getTime();
        await manager.save(savedExecution);

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

        // 保存当前工作流状态（使用已经部分执行的工作流）
        const { metrics, progress } = this.calculateMetrics(currentWorkflow);

        savedState.metadata = toJson(currentWorkflow);
        savedState.status = 'fail';
        savedState.progress = progress;
        savedState.errorMessage = errorMessage;
        savedState.completedAt = new Date();
        await manager.save(savedState);

        // 更新执行记录为失败
        savedExecution.status = 'fail';
        savedExecution.metrics = metrics;
        savedExecution.finishedAt = new Date();
        savedExecution.durationMs = Date.now() - savedExecution.startedAt.getTime();
        await manager.save(savedExecution);

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
   * 恢复并继续执行工作流
   */
  async resumeWorkflow(executionId: string): Promise<{ execution: WorkflowExecutionEntity; state: WorkflowStateEntity; result: any }> {
    return await useTranslation(async (manager) => {
      // 获取执行记录和状态
      const execution = await manager.findOne(WorkflowExecutionEntity, { where: { id: executionId } });
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      const state = await manager.findOne(WorkflowStateEntity, { where: { executionId } });
      if (!state) {
        throw new Error(`State for execution ${executionId} not found`);
      }

      // 检查是否可以恢复
      if (state.status === 'success') {
        throw new Error(`Workflow already completed successfully`);
      }

      // 直接从 metadata 恢复 WorkflowGraphAst
      if (!state.metadata || Object.keys(state.metadata).length === 0) {
        throw new Error(`Cannot resume: metadata is empty`);
      }

      const workflow = fromJson(state.metadata) as WorkflowGraphAst;

      // 更新状态为运行中
      state.status = 'running';
      state.retryCount += 1;
      await manager.save(state);

      execution.status = 'running';
      await manager.save(execution);

      // 定义在外部作用域，以便错误处理时可以访问
      let currentWorkflow = workflow;

      try {
        console.log(`[WorkflowService] Resuming execution of workflow ${execution.workflowId}`);

        // 循环执行工作流，每次迭代后更新数据库状态
        while (currentWorkflow.state === 'pending' || currentWorkflow.state === 'running') {
          currentWorkflow = await executeAst(currentWorkflow);

          // 每次执行后计算并更新状态
          const { progress } = this.calculateMetrics(currentWorkflow);

          state.metadata = toJson(currentWorkflow);
          state.status = currentWorkflow.state;
          state.progress = progress;

          // 实时更新到数据库
          await manager.save(state);

          console.log(`[WorkflowService] Resume Progress: ${progress}%, status: ${currentWorkflow.state}`);
        }

        const result = currentWorkflow;
        console.log(`[WorkflowService] Workflow ${execution.workflowId} resumed successfully`);

        // 计算最终指标
        const { metrics } = this.calculateMetrics(result);

        // 最终状态保存
        state.completedAt = new Date();
        await manager.save(state);

        // 更新执行记录
        execution.status = result.state;
        execution.metrics = metrics;
        execution.finishedAt = new Date();
        execution.durationMs = Date.now() - execution.startedAt.getTime();
        await manager.save(execution);

        // 更新缓存
        await this.redis.set(`workflow:execution:${execution.id}`, JSON.stringify({
          status: execution.status,
          result,
          duration: execution.durationMs
        }), 3600);

        await this.redis.set(`workflow:execution:state:${execution.id}`, JSON.stringify({
          id: state.id,
          status: state.status,
          completedAt: state.completedAt
        }), 3600);

        return { execution, state, result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[WorkflowService] Workflow ${execution.workflowId} resume failed:`, errorMessage);

        // 保存当前工作流状态（使用已经部分执行的工作流）
        const { metrics, progress } = this.calculateMetrics(currentWorkflow);

        state.metadata = toJson(currentWorkflow);
        state.status = 'fail';
        state.progress = progress;
        state.errorMessage = errorMessage;
        state.completedAt = new Date();
        await manager.save(state);

        // 更新执行记录为失败
        execution.status = 'fail';
        execution.metrics = metrics;
        execution.finishedAt = new Date();
        execution.durationMs = Date.now() - execution.startedAt.getTime();
        await manager.save(execution);

        // 更新缓存
        await this.redis.set(`workflow:execution:${execution.id}`, JSON.stringify({
          status: execution.status,
          error: errorMessage,
          duration: execution.durationMs
        }), 3600);

        await this.redis.set(`workflow:execution:state:${execution.id}`, JSON.stringify({
          id: state.id,
          status: state.status,
          error: errorMessage,
          completedAt: state.completedAt
        }), 3600);

        throw new Error(`Workflow resume failed: ${errorMessage}`);
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
      if (stateData.status === 'running') {
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
  private convertToWorkflowDefinition(workflow: WorkflowGraphAst) {
    return toJson(workflow);
  }

  /**
   * 从WorkflowDefinition重建WorkflowGraphAst
   */
  private convertFromWorkflowDefinition(definition: NodeJsonPayload): WorkflowGraphAst {
    return fromJson(definition)
  }
}