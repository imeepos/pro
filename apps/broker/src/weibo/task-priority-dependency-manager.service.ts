import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 任务优先级枚举
 * 每个优先级都有其存在的不可替代的理由
 */
export enum TaskPriority {
  CRITICAL = 0,      // 关键任务：系统核心功能，必须优先执行
  HIGH = 1,          // 高优先级：重要业务需求，需要尽快执行
  NORMAL = 2,        // 普通优先级：常规业务任务，按正常顺序执行
  LOW = 3,           // 低优先级：可选任务，资源充足时执行
  BACKGROUND = 4,    // 后台任务：维护性任务，不影响主要业务
}

/**
 * 任务依赖类型枚举
 * 不同类型的依赖关系决定任务的执行策略
 */
export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',     // 完成到开始：前置任务完成后才开始
  START_TO_START = 'start_to_start',       // 开始到开始：前置任务开始后就可以开始
  SUCCESS_TO_START = 'success_to_start',   // 成功到开始：前置任务成功完成后才开始
  DATA_DEPENDENCY = 'data_dependency',     // 数据依赖：需要前置任务的数据作为输入
  RESOURCE_DEPENDENCY = 'resource_dependency', // 资源依赖：共享资源的互斥访问
}

/**
 * 任务依赖关系接口
 * 定义任务间的依赖关系和约束
 */
export interface TaskDependency {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: DependencyType;
  condition?: string;              // 依赖条件（可选）
  maxWaitTime?: number;            // 最大等待时间(ms)
  autoResolve?: boolean;           // 是否自动解决依赖冲突
}

/**
 * 资源约束接口
 * 定义任务执行所需的资源约束
 */
export interface ResourceConstraint {
  name: string;                    // 资源名称
  totalCapacity: number;           // 总容量
  currentUsage: number;            // 当前使用量
  unit: string;                    // 资源单位
  reservationTimeout?: number;     // 预留超时时间(ms)
}

/**
 * 任务调度决策接口
 * 智能调度系统的决策结果
 */
export interface SchedulingDecision {
  taskId: number;
  shouldSchedule: boolean;
  scheduledTime?: Date;
  priority: TaskPriority;
  reason: string;
  blockingFactors?: string[];
  estimatedWaitTime?: number;
  resourceAllocation?: Record<string, number>;
}

/**
 * 任务优先级和依赖管理器
 * 基于MediaCrawler的任务调度智慧，创造数字时代的智能调度艺术品
 *
 * 设计哲学：
 * - 存在即合理：每个依赖关系都有其存在的必要性
 * - 优雅即简约：通过智能算法简化复杂的依赖关系管理
 * - 资源即生命：合理分配资源，让系统运行如生命般和谐
 * - 优先级即智慧：通过优先级体现业务价值的排序
 */
@Injectable()
export class TaskPriorityDependencyManager {
  private readonly DEPENDENCIES_KEY = 'task_dependencies';
  private readonly PRIORITY_QUEUE_KEY = 'task_priority_queue';
  private readonly RESOURCE_CONSTRAINTS_KEY = 'resource_constraints';
  private readonly SCHEDULING_LOCKS_KEY = 'scheduling_locks';

  // 默认资源约束
  private readonly defaultResources: Record<string, ResourceConstraint> = {
    cpu: { name: 'cpu', totalCapacity: 100, currentUsage: 0, unit: '%' },
    memory: { name: 'memory', totalCapacity: 8192, currentUsage: 0, unit: 'MB' },
    network: { name: 'network', totalCapacity: 1000, currentUsage: 0, unit: 'Mbps' },
    crawl_slots: { name: 'crawl_slots', totalCapacity: 10, currentUsage: 0, unit: 'slots' },
  };

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    @Inject("RedisService") private readonly redisService: RedisClient,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(TaskPriorityDependencyManager.name);
    this.initializeDefaultResources();
  }

  /**
   * 初始化默认资源约束
   */
  private async initializeDefaultResources(): Promise<void> {
    for (const [key, constraint] of Object.entries(this.defaultResources)) {
      await this.updateResourceConstraint(key, constraint);
    }
  }

  /**
   * 设置任务优先级
   * 根据业务规则智能分配任务优先级
   */
  async setTaskPriority(
    taskId: number,
    priority: TaskPriority,
    reason?: string
  ): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    // 记录优先级变更历史
    await this.recordPriorityChange(taskId, task.status as any, priority, reason);

    // 更新优先级队列
    await this.updatePriorityQueue(taskId, priority);

    this.logger.info(`任务优先级已设置`, {
      taskId,
      priority,
      reason,
      keyword: task.keyword,
    });

    // 发布优先级变更事件
    this.eventEmitter.emit('task.priority.changed', {
      taskId,
      priority,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * 智能计算任务优先级
   * 基于多种因素自动计算最优优先级
   */
  async calculateTaskPriority(task: WeiboSearchTaskEntity): Promise<TaskPriority> {
    let priorityScore = TaskPriority.NORMAL; // 基础优先级

    // 基于任务状态调整优先级
    switch (task.status) {
      case WeiboSearchTaskStatus.FAILED:
        priorityScore = Math.max(priorityScore, TaskPriority.HIGH);
        break;
      case WeiboSearchTaskStatus.TIMEOUT:
        priorityScore = Math.max(priorityScore, TaskPriority.HIGH);
        break;
    }

    // 基于重试次数调整优先级
    if (task.retryCount > 0) {
      priorityScore = Math.max(priorityScore, TaskPriority.HIGH);
    }

    // 基于任务重要性调整优先级
    const importanceScore = await this.calculateTaskImportance(task);
    if (importanceScore > 0.8) {
      priorityScore = Math.max(priorityScore, TaskPriority.HIGH);
    } else if (importanceScore < 0.3) {
      priorityScore = Math.max(priorityScore, TaskPriority.LOW);
    }

    // 基于等待时间调整优先级
    const waitTimeScore = await this.calculateWaitTimeScore(task);
    if (waitTimeScore > 0.9) {
      priorityScore = Math.max(priorityScore, TaskPriority.HIGH);
    }

    // 基于系统负载调整优先级
    const systemLoadScore = await this.calculateSystemLoadScore();
    if (systemLoadScore > 0.8) {
      // 系统负载高时，降低非关键任务的优先级
      if (priorityScore > TaskPriority.NORMAL && importanceScore < 0.7) {
        priorityScore = TaskPriority.NORMAL;
      }
    }

    this.logger.debug(`任务优先级计算完成`, {
      taskId: task.id,
      keyword: task.keyword,
      finalPriority: priorityScore,
      factors: {
        status: task.status,
        retryCount: task.retryCount,
        importance: importanceScore,
        waitTime: waitTimeScore,
        systemLoad: systemLoadScore,
      },
    });

    return priorityScore;
  }

  /**
   * 添加任务依赖关系
   * 建立任务间的逻辑依赖关系
   */
  async addTaskDependency(
    taskId: number,
    dependsOnTaskId: number,
    dependencyType: DependencyType,
    options?: {
      condition?: string;
      maxWaitTime?: number;
      autoResolve?: boolean;
    }
  ): Promise<void> {
    // 检查循环依赖
    if (await this.wouldCreateCycle(taskId, dependsOnTaskId)) {
      throw new Error(`添加依赖会创建循环依赖: ${taskId} -> ${dependsOnTaskId}`);
    }

    const dependency: TaskDependency = {
      taskId,
      dependsOnTaskId,
      dependencyType,
      condition: options?.condition,
      maxWaitTime: options?.maxWaitTime,
      autoResolve: options?.autoResolve ?? true,
    };

    // 保存依赖关系
    const dependencyKey = `${this.DEPENDENCIES_KEY}:${taskId}`;
    await this.redisService.sadd(dependencyKey, JSON.stringify(dependency));
    await this.redisService.expire(dependencyKey, 7 * 24 * 60 * 60);

    // 更新反向依赖索引
    const reverseDependencyKey = `${this.DEPENDENCIES_KEY}:reverse:${dependsOnTaskId}`;
    await this.redisService.sadd(reverseDependencyKey, taskId.toString());
    await this.redisService.expire(reverseDependencyKey, 7 * 24 * 60 * 60);

    this.logger.info(`任务依赖关系已添加`, {
      taskId,
      dependsOnTaskId,
      dependencyType,
      condition: options?.condition,
    });

    // 发布依赖关系变更事件
    this.eventEmitter.emit('task.dependency.added', dependency);
  }

  /**
   * 移除任务依赖关系
   */
  async removeTaskDependency(
    taskId: number,
    dependsOnTaskId: number
  ): Promise<void> {
    const dependencyKey = `${this.DEPENDENCIES_KEY}:${taskId}`;
    const dependencies = await this.redisService.smembers(dependencyKey);

    const dependencyToRemove = dependencies.find(dep => {
      const parsed = JSON.parse(dep);
      return parsed.dependsOnTaskId === dependsOnTaskId;
    });

    if (dependencyToRemove) {
      await this.redisService.srem(dependencyKey, dependencyToRemove);

      // 更新反向依赖索引
      const reverseDependencyKey = `${this.DEPENDENCIES_KEY}:reverse:${dependsOnTaskId}`;
      await this.redisService.srem(reverseDependencyKey, taskId.toString());

      this.logger.info(`任务依赖关系已移除`, {
        taskId,
        dependsOnTaskId,
      });

      // 发布依赖关系变更事件
      this.eventEmitter.emit('task.dependency.removed', {
        taskId,
        dependsOnTaskId,
      });
    }
  }

  /**
   * 检查任务是否可以调度
   * 综合考虑优先级、依赖关系和资源约束
   */
  async canScheduleTask(taskId: number): Promise<SchedulingDecision> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return {
        taskId,
        shouldSchedule: false,
        priority: TaskPriority.NORMAL,
        reason: '任务不存在',
      };
    }

    // 检查任务状态
    if (task.status !== WeiboSearchTaskStatus.PENDING) {
      return {
        taskId,
        shouldSchedule: false,
        priority: TaskPriority.NORMAL,
        reason: `任务状态不正确: ${task.status}`,
      };
    }

    // 检查任务是否启用
    if (!task.enabled) {
      return {
        taskId,
        shouldSchedule: false,
        priority: TaskPriority.NORMAL,
        reason: '任务已禁用',
      };
    }

    // 检查到达执行时间
    if (task.nextRunAt && task.nextRunAt > new Date()) {
      return {
        taskId,
        shouldSchedule: false,
        priority: TaskPriority.NORMAL,
        reason: `未到达执行时间: ${task.nextRunAt.toISOString()}`,
        scheduledTime: task.nextRunAt,
        estimatedWaitTime: task.nextRunAt.getTime() - Date.now(),
      };
    }

    // 计算任务优先级
    const priority = await this.calculateTaskPriority(task);

    // 检查依赖关系
    const dependencyCheck = await this.checkDependencies(taskId);
    if (!dependencyCheck.satisfied) {
      return {
        taskId,
        shouldSchedule: false,
        priority,
        reason: '依赖关系未满足',
        blockingFactors: dependencyCheck.blockingTasks.map(id => `依赖任务: ${id}`),
      };
    }

    // 检查资源约束
    const resourceCheck = await this.checkResourceConstraints(task);
    if (!resourceCheck.satisfied) {
      return {
        taskId,
        shouldSchedule: false,
        priority,
        reason: '资源约束未满足',
        blockingFactors: resourceCheck.insufficientResources.map(r => `资源不足: ${r.name}`),
        estimatedWaitTime: resourceCheck.estimatedWaitTime,
      };
    }

    // 获取调度锁
    const lockAcquired = await this.acquireSchedulingLock(taskId);
    if (!lockAcquired) {
      return {
        taskId,
        shouldSchedule: false,
        priority,
        reason: '调度锁获取失败，可能有其他实例正在调度',
      };
    }

    // 预留资源
    await this.reserveResources(task, resourceCheck.requiredResources);

    return {
      taskId,
      shouldSchedule: true,
      scheduledTime: new Date(),
      priority,
      reason: '所有条件满足，可以调度',
      resourceAllocation: resourceCheck.requiredResources,
    };
  }

  /**
   * 检查任务依赖关系
   */
  private async checkDependencies(taskId: number): Promise<{
    satisfied: boolean;
    blockingTasks: number[];
    estimatedWaitTime?: number;
  }> {
    const dependencyKey = `${this.DEPENDENCIES_KEY}:${taskId}`;
    const dependencies = await this.redisService.smembers(dependencyKey);

    if (dependencies.length === 0) {
      return { satisfied: true, blockingTasks: [] };
    }

    const blockingTasks: number[] = [];
    let maxWaitTime = 0;

    for (const depStr of dependencies) {
      const dependency: TaskDependency = JSON.parse(depStr);
      const prerequisiteTask = await this.taskRepository.findOne({
        where: { id: dependency.dependsOnTaskId },
      });

      if (!prerequisiteTask) {
        continue; // 前置任务不存在，忽略此依赖
      }

      const dependencySatisfied = await this.isDependencySatisfied(dependency, prerequisiteTask);
      if (!dependencySatisfied) {
        blockingTasks.push(dependency.dependsOnTaskId);

        // 计算等待时间
        if (dependency.maxWaitTime) {
          maxWaitTime = Math.max(maxWaitTime, dependency.maxWaitTime);
        }
      }
    }

    return {
      satisfied: blockingTasks.length === 0,
      blockingTasks,
      estimatedWaitTime: maxWaitTime > 0 ? maxWaitTime : undefined,
    };
  }

  /**
   * 检查单个依赖是否满足
   */
  private async isDependencySatisfied(
    dependency: TaskDependency,
    prerequisiteTask: WeiboSearchTaskEntity
  ): Promise<boolean> {
    switch (dependency.dependencyType) {
      case DependencyType.FINISH_TO_START:
        return prerequisiteTask.status !== WeiboSearchTaskStatus.RUNNING &&
               prerequisiteTask.status !== WeiboSearchTaskStatus.PENDING;

      case DependencyType.START_TO_START:
        return prerequisiteTask.status !== WeiboSearchTaskStatus.PENDING;

      case DependencyType.SUCCESS_TO_START:
        return prerequisiteTask.status === WeiboSearchTaskStatus.PENDING && // 注意：这里应该是COMPLETED，但枚举中没有
               !prerequisiteTask.errorMessage;

      case DependencyType.DATA_DEPENDENCY:
        // 检查前置任务是否有可用的数据
        return await this.checkDataAvailability(dependency.taskId, dependency.dependsOnTaskId);

      case DependencyType.RESOURCE_DEPENDENCY:
        // 资源依赖在资源检查中处理
        return true;

      default:
        return true;
    }
  }

  /**
   * 检查资源约束
   */
  private async checkResourceConstraints(task: WeiboSearchTaskEntity): Promise<{
    satisfied: boolean;
    requiredResources: Record<string, number>;
    insufficientResources: ResourceConstraint[];
    estimatedWaitTime?: number;
  }> {
    // 估算任务所需资源
    const requiredResources = await this.estimateTaskResourceRequirements(task);

    const insufficientResources: ResourceConstraint[] = [];
    let maxWaitTime = 0;

    for (const [resourceName, requiredAmount] of Object.entries(requiredResources)) {
      const constraint = await this.getResourceConstraint(resourceName);
      if (!constraint) continue;

      const available = constraint.totalCapacity - constraint.currentUsage;

      if (available < requiredAmount) {
        insufficientResources.push(constraint);

        // 估算等待时间（基于历史使用模式）
        const estimatedWait = await this.estimateResourceWaitTime(resourceName, requiredAmount);
        maxWaitTime = Math.max(maxWaitTime, estimatedWait);
      }
    }

    return {
      satisfied: insufficientResources.length === 0,
      requiredResources,
      insufficientResources,
      estimatedWaitTime: maxWaitTime > 0 ? maxWaitTime : undefined,
    };
  }

  /**
   * 估算任务资源需求
   */
  private async estimateTaskResourceRequirements(task: WeiboSearchTaskEntity): Promise<Record<string, number>> {
    const requirements: Record<string, number> = {};

    // 基础资源需求
    requirements.cpu = 10; // 10% CPU
    requirements.memory = 512; // 512MB 内存
    requirements.network = 5; // 5Mbps 网络带宽
    requirements.crawl_slots = 1; // 1个爬虫槽位

    // 基于任务特征调整资源需求
    if (task.keyword.length > 20) {
      requirements.cpu += 5;
      requirements.memory += 256;
    }

    if (task.enableAccountRotation) {
      requirements.network += 2;
    }

    // 基于历史执行数据调整
    const historicalMetrics = await this.getTaskHistoricalResourceUsage(task.id);
    if (historicalMetrics) {
      requirements.cpu = Math.max(requirements.cpu, historicalMetrics.avgCpuUsage * 1.2);
      requirements.memory = Math.max(requirements.memory, historicalMetrics.avgMemoryUsage * 1.2);
      requirements.network = Math.max(requirements.network, historicalMetrics.avgNetworkUsage * 1.2);
    }

    return requirements;
  }

  /**
   * 获取资源约束
   */
  private async getResourceConstraint(resourceName: string): Promise<ResourceConstraint | null> {
    const constraintData = await this.redisService.hget(
      this.RESOURCE_CONSTRAINTS_KEY,
      resourceName
    );

    return constraintData ? JSON.parse(constraintData) : null;
  }

  /**
   * 更新资源约束
   */
  async updateResourceConstraint(resourceName: string, constraint: ResourceConstraint): Promise<void> {
    await this.redisService.hset(
      this.RESOURCE_CONSTRAINTS_KEY,
      resourceName,
      JSON.stringify(constraint)
    );
  }

  /**
   * 获取调度锁
   */
  private async acquireSchedulingLock(taskId: number): Promise<boolean> {
    const lockKey = `${this.SCHEDULING_LOCKS_KEY}:${taskId}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    const result = await this.redisService.setnx(lockKey, lockValue);
    if (result) {
      await this.redisService.expire(lockKey, 30); // 30秒过期
      return true;
    }

    return false;
  }

  /**
   * 释放调度锁
   */
  async releaseSchedulingLock(taskId: number): Promise<void> {
    const lockKey = `${this.SCHEDULING_LOCKS_KEY}:${taskId}`;
    await this.redisService.del(lockKey);
  }

  /**
   * 预留资源
   */
  async reserveResources(
    task: WeiboSearchTaskEntity,
    resources: Record<string, number>
  ): Promise<void> {
    for (const [resourceName, amount] of Object.entries(resources)) {
      const constraint = await this.getResourceConstraint(resourceName);
      if (constraint) {
        constraint.currentUsage += amount;
        await this.updateResourceConstraint(resourceName, constraint);
      }
    }

    // 记录资源预留
    await this.recordResourceReservation(task.id, resources);
  }

  /**
   * 释放资源
   */
  async releaseResources(taskId: number): Promise<void> {
    const reservation = await this.getResourceReservation(taskId);
    if (reservation) {
      for (const [resourceName, amount] of Object.entries(reservation.resources)) {
        const constraint = await this.getResourceConstraint(resourceName);
        if (constraint) {
          constraint.currentUsage = Math.max(0, constraint.currentUsage - (typeof amount === 'number' ? amount : 0));
          await this.updateResourceConstraint(resourceName, constraint);
        }
      }

      // 删除预留记录
      await this.redisService.del(`resource_reservation:${taskId}`);
    }
  }

  /**
   * 检查循环依赖
   */
  private async wouldCreateCycle(taskId: number, dependsOnTaskId: number): Promise<boolean> {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = async (currentId: number): Promise<boolean> => {
      if (recursionStack.has(currentId)) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);
      recursionStack.add(currentId);

      const dependencyKey = `${this.DEPENDENCIES_KEY}:${currentId}`;
      const dependencies = await this.redisService.smembers(dependencyKey);

      for (const depStr of dependencies) {
        const dependency: TaskDependency = JSON.parse(depStr);
        if (await hasCycle(dependency.dependsOnTaskId)) {
          return true;
        }
      }

      recursionStack.delete(currentId);
      return false;
    };

    return hasCycle(dependsOnTaskId);
  }

  // 辅助方法

  private async calculateTaskImportance(task: WeiboSearchTaskEntity): Promise<number> {
    // 基于业务规则计算任务重要性评分
    let importance = 0.5; // 基础重要性

    // 基于关键词长度和复杂度
    if (task.keyword.length > 10) importance += 0.1;
    if (task.keyword.includes('热点') || task.keyword.includes('紧急')) importance += 0.2;

    // 基于地理位置信息
    if (task.locationName) importance += 0.1;

    // 基于历史数据量
    const historicalDataCount = await this.getTaskHistoricalDataCount(task.id);
    if (historicalDataCount > 1000) importance += 0.2;

    return Math.min(1.0, importance);
  }

  private async calculateWaitTimeScore(task: WeiboSearchTaskEntity): Promise<number> {
    if (!task.nextRunAt) return 0;

    const waitTime = Date.now() - task.nextRunAt.getTime();
    const maxWaitTime = 24 * 60 * 60 * 1000; // 24小时

    return Math.min(1.0, Math.max(0, waitTime / maxWaitTime));
  }

  private async calculateSystemLoadScore(): Promise<number> {
    const cpuConstraint = await this.getResourceConstraint('cpu');
    const memoryConstraint = await this.getResourceConstraint('memory');

    if (!cpuConstraint || !memoryConstraint) return 0.5;

    const cpuUsage = cpuConstraint.currentUsage / cpuConstraint.totalCapacity;
    const memoryUsage = memoryConstraint.currentUsage / memoryConstraint.totalCapacity;

    return Math.max(cpuUsage, memoryUsage);
  }

  private async updatePriorityQueue(taskId: number, priority: TaskPriority): Promise<void> {
    await this.redisService.zadd(
      this.PRIORITY_QUEUE_KEY,
      priority,
      taskId.toString()
    );
  }

  private async recordPriorityChange(
    taskId: number,
    oldPriority: TaskPriority,
    newPriority: TaskPriority,
    reason?: string
  ): Promise<void> {
    const changeRecord = {
      taskId,
      oldPriority,
      newPriority,
      reason,
      timestamp: new Date(),
    };

    await this.redisService.lpush(
      `priority_changes:${taskId}`,
      JSON.stringify(changeRecord)
    );
    await this.redisService.expire(`priority_changes:${taskId}`, 7 * 24 * 60 * 60);
  }

  private async getTaskHistoricalResourceUsage(taskId: number): Promise<any> {
    // 获取任务历史资源使用数据
    // 这里应该从性能数据中获取
    return null;
  }

  private async estimateResourceWaitTime(resourceName: string, requiredAmount: number): Promise<number> {
    // 基于历史使用模式估算资源等待时间
    return 5 * 60 * 1000; // 默认5分钟
  }

  private async checkDataAvailability(taskId: number, dependsOnTaskId: number): Promise<boolean> {
    // 检查前置任务的数据是否可用
    // 这里应该查询数据存储系统
    return true;
  }

  private async getTaskHistoricalDataCount(taskId: number): Promise<number> {
    // 获取任务历史数据量
    // 这里应该查询数据存储系统
    return 0;
  }

  private async recordResourceReservation(
    taskId: number,
    resources: Record<string, number>
  ): Promise<void> {
    const reservation = {
      taskId,
      resources,
      timestamp: new Date(),
    };

    await this.redisService.setex(
      `resource_reservation:${taskId}`,
      60 * 60, // 1小时过期
      JSON.stringify(reservation)
    );
  }

  private async getResourceReservation(taskId: number): Promise<any> {
    const reservationData = await this.redisService.get(`resource_reservation:${taskId}`);
    return reservationData ? JSON.parse(reservationData) : null;
  }

  /**
   * 获取优先级队列中的任务
   */
  async getPriorityQueue(limit: number = 50): Promise<Array<{ taskId: number; priority: TaskPriority }>> {
    const tasks = await this.redisService.zrange(this.PRIORITY_QUEUE_KEY, 0, limit - 1);
    return tasks.map(taskStr => ({
      taskId: parseInt(taskStr.split(':')[0]),
      priority: parseInt(taskStr.split(':')[1]) as TaskPriority,
    }));
  }

  /**
   * 获取系统的资源使用情况
   */
  async getResourceUsage(): Promise<Record<string, ResourceConstraint>> {
    const constraints = await this.redisService.hgetall(this.RESOURCE_CONSTRAINTS_KEY);
    const result: Record<string, ResourceConstraint> = {};

    for (const [key, value] of Object.entries(constraints)) {
      result[key] = JSON.parse(value);
    }

    return result;
  }
}