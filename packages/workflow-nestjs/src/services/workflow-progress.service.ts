import { Injectable, Logger } from '@nestjs/common';
import { RedisClient } from '@pro/redis';

export interface WorkflowProgress {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  startedAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class WorkflowProgressService {
  private readonly logger = new Logger(WorkflowProgressService.name);
  private readonly keyPrefix = 'workflow:progress:';
  private readonly ttl = 7 * 24 * 60 * 60;

  constructor(private readonly redis: RedisClient) {}

  async startWorkflow(
    workflowId: string,
    totalSteps: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const progress: WorkflowProgress = {
      workflowId,
      status: 'running',
      totalSteps,
      completedSteps: 0,
      currentStep: 'initializing',
      startedAt: new Date(),
      updatedAt: new Date(),
      ...(metadata && { metadata }),
    };

    await this.redis.setex(
      `${this.keyPrefix}${workflowId}`,
      this.ttl,
      JSON.stringify(progress),
    );

    this.logger.log(`工作流已启动: ${workflowId}`, { totalSteps, metadata });
  }

  async updateProgress(
    workflowId: string,
    currentStep: string,
    completedSteps?: number,
  ): Promise<void> {
    const key = `${this.keyPrefix}${workflowId}`;
    const existing = await this.redis.get(key);

    if (!existing) {
      this.logger.warn(`工作流进度不存在: ${workflowId}`);
      return;
    }

    const progress: WorkflowProgress = JSON.parse(existing);
    progress.currentStep = currentStep;
    progress.updatedAt = new Date();

    if (completedSteps !== undefined) {
      progress.completedSteps = completedSteps;
    } else {
      progress.completedSteps += 1;
    }

    await this.redis.setex(key, this.ttl, JSON.stringify(progress));
  }

  async completeWorkflow(workflowId: string): Promise<void> {
    const key = `${this.keyPrefix}${workflowId}`;
    const existing = await this.redis.get(key);

    if (!existing) {
      return;
    }

    const progress: WorkflowProgress = JSON.parse(existing);
    progress.status = 'completed';
    progress.completedSteps = progress.totalSteps;
    progress.updatedAt = new Date();

    await this.redis.setex(key, this.ttl, JSON.stringify(progress));

    this.logger.log(`工作流已完成: ${workflowId}`);
  }

  async failWorkflow(workflowId: string, error?: string): Promise<void> {
    const key = `${this.keyPrefix}${workflowId}`;
    const existing = await this.redis.get(key);

    if (!existing) {
      return;
    }

    const progress: WorkflowProgress = JSON.parse(existing);
    progress.status = 'failed';
    progress.updatedAt = new Date();

    if (error) {
      progress.metadata = { ...progress.metadata, error };
    }

    await this.redis.setex(key, this.ttl, JSON.stringify(progress));

    this.logger.error(`工作流失败: ${workflowId}`, { error });
  }

  async getProgress(workflowId: string): Promise<WorkflowProgress | null> {
    const key = `${this.keyPrefix}${workflowId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async listRunningWorkflows(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const runningWorkflows: string[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const progress: WorkflowProgress = JSON.parse(data);
        if (progress.status === 'running') {
          runningWorkflows.push(progress.workflowId);
        }
      }
    }

    return runningWorkflows;
  }
}
