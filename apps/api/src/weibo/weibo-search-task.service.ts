import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';
import { LessThanOrEqual } from 'typeorm';

import { WeiboSearchTaskEntity, WeiboSubTaskEntity, useEntityManager } from '@pro/entities';

import {
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  QueryTaskDto,
  PauseTaskDto,
  ResumeTaskDto,
  RunNowTaskDto,
} from './dto/weibo-search-task.dto';
import { QueryWeiboSubTaskDto } from './dto/weibo-sub-task.dto';

@Injectable()
export class WeiboSearchTaskService {
  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboSearchTaskService.name);
  }

  async create(userId: string, dto: CreateWeiboSearchTaskDto): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      const startDate = new Date(dto.startDate);

      if (Number.isNaN(startDate.getTime())) {
        throw new BadRequestException('监控起始时间格式无效');
      }

      if (startDate > new Date()) {
        throw new BadRequestException('监控起始时间不能晚于当前时间');
      }

      const taskRepo = m.getRepository(WeiboSearchTaskEntity);
      const task = taskRepo.create({
        keyword: dto.keyword,
        startDate,
        crawlInterval: dto.crawlInterval ?? '1h',
        nextRunAt: new Date(),
        enabled: true,
        userId,
      });

      const saved = await taskRepo.save(task);
      this.logger.info({ taskId: saved.id }, '创建微博搜索任务');
      return saved;
    });
  }

  async findAll(userId: string, query: QueryTaskDto) {
    return useEntityManager(async (m) => {
      const {
        page = 1,
        limit = 10,
        keyword,
        enabled,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = query;

      const qb = m.getRepository(WeiboSearchTaskEntity)
        .createQueryBuilder('task')
        .where('task.userId = :userId', { userId });

      if (keyword) {
        qb.andWhere('task.keyword ILIKE :keyword', { keyword: `%${keyword}%` });
      }

      if (typeof enabled === 'boolean') {
        qb.andWhere('task.enabled = :enabled', { enabled });
      }

      const safeSortField = ['createdAt', 'updatedAt', 'startDate', 'nextRunAt'].includes(sortBy)
        ? sortBy
        : 'createdAt';
      const order = (sortOrder?.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

      qb.orderBy(`task.${safeSortField}`, order as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      qb.skip(offset).take(limit);

      const [tasks, total] = await qb.getManyAndCount();

      return {
        tasks,
        total,
        page,
        limit,
      };
    });
  }

  async findOne(userId: string, id: number): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      const task = await m.getRepository(WeiboSearchTaskEntity).findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException('微博搜索任务不存在');
      }

      if (task.userId !== userId) {
        throw new ForbiddenException('无权访问该任务');
      }

      return task;
    });
  }

  async update(userId: string, id: number, dto: UpdateWeiboSearchTaskDto): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      const task = await this.findOne(userId, id);
      const updates: Partial<WeiboSearchTaskEntity> = {};

      if (dto.keyword !== undefined) {
        updates.keyword = dto.keyword;
      }

      if (dto.startDate !== undefined) {
        const startDate = new Date(dto.startDate);
        if (Number.isNaN(startDate.getTime())) {
          throw new BadRequestException('监控起始时间格式无效');
        }
        if (startDate > new Date()) {
          throw new BadRequestException('监控起始时间不能晚于当前时间');
        }
        updates.startDate = startDate;
      }

      if (dto.crawlInterval !== undefined) {
        updates.crawlInterval = dto.crawlInterval;
      }

      if (dto.enabled !== undefined) {
        updates.enabled = dto.enabled;
        if (dto.enabled && !task.nextRunAt) {
          updates.nextRunAt = new Date();
        }
      }

      if (Object.keys(updates).length === 0) {
        return task;
      }

      await m.getRepository(WeiboSearchTaskEntity).update(id, updates);
      this.logger.info({ taskId: id, fields: Object.keys(updates) }, '更新微博搜索任务');
      return this.findOne(userId, id);
    });
  }

  async delete(userId: string, id: number): Promise<void> {
    return useEntityManager(async (m) => {
      await this.findOne(userId, id);
      await m.getRepository(WeiboSearchTaskEntity).delete(id);
      this.logger.info({ taskId: id }, '删除微博搜索任务');
    });
  }

  async pause(userId: string, id: number, _dto?: PauseTaskDto): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      await this.findOne(userId, id);
      await m.getRepository(WeiboSearchTaskEntity).update(id, { enabled: false });
      return this.findOne(userId, id);
    });
  }

  async resume(userId: string, id: number, _dto?: ResumeTaskDto): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      await this.findOne(userId, id);
      await m.getRepository(WeiboSearchTaskEntity).update(id, {
        enabled: true,
        nextRunAt: new Date(),
      });
      return this.findOne(userId, id);
    });
  }

  async runNow(userId: string, id: number, _dto?: RunNowTaskDto): Promise<WeiboSearchTaskEntity> {
    return useEntityManager(async (m) => {
      await this.findOne(userId, id);
      await m.getRepository(WeiboSearchTaskEntity).update(id, {
        nextRunAt: new Date(),
        enabled: true,
      });
      return this.findOne(userId, id);
    });
  }

  async pauseAllTasks(userId: string): Promise<number> {
    return useEntityManager(async (m) => {
      const result = await m.getRepository(WeiboSearchTaskEntity).update(
        { userId, enabled: true },
        { enabled: false },
      );
      return result.affected ?? 0;
    });
  }

  async resumeAllTasks(userId: string): Promise<number> {
    return useEntityManager(async (m) => {
      const result = await m.getRepository(WeiboSearchTaskEntity).update(
        { userId, enabled: false },
        {
          enabled: true,
          nextRunAt: new Date(),
        },
      );
      return result.affected ?? 0;
    });
  }

  async getTaskStats(userId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
  }> {
    return useEntityManager(async (m) => {
      const taskRepo = m.getRepository(WeiboSearchTaskEntity);
      const [total, enabled] = await Promise.all([
        taskRepo.count({ where: { userId } }),
        taskRepo.count({ where: { userId, enabled: true } }),
      ]);

      return {
        total,
        enabled,
        disabled: total - enabled,
      };
    });
  }

  async getPendingTasks(): Promise<WeiboSearchTaskEntity[]> {
    return useEntityManager(async (m) => {
      return m.getRepository(WeiboSearchTaskEntity).find({
        where: {
          enabled: true,
          nextRunAt: LessThanOrEqual(new Date()),
        },
        order: { nextRunAt: 'ASC' },
      });
    });
  }

  async updateTaskStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    return useEntityManager(async (m) => {
      const taskRepo = m.getRepository(WeiboSearchTaskEntity);
      const task = await taskRepo.findOne({ where: { id } });
      if (!task) {
        this.logger.warn({ taskId: id, status }, '未找到微博搜索任务，忽略状态更新');
        return;
      }

      if (status === 'completed' || status === 'failed') {
        await taskRepo.update(id, {
          latestCrawlTime: task.latestCrawlTime ?? new Date(),
          nextRunAt: status === 'completed' ? this.calculateNextRun(task.crawlInterval) : task.nextRunAt,
        });
      }

      if (errorMessage) {
        this.logger.error({ taskId: id, status, errorMessage }, '微博搜索任务执行异常');
      }
    });
  }

  async updateTaskProgress(
    id: number,
    progress: {
      currentCrawlTime?: Date;
      latestCrawlTime?: Date;
      nextRunAt?: Date;
      progress?: number;
      noDataCount?: number;
    },
  ): Promise<void> {
    return useEntityManager(async (m) => {
      const taskRepo = m.getRepository(WeiboSearchTaskEntity);
      const task = await taskRepo.findOne({ where: { id } });
      if (!task) {
        this.logger.warn({ taskId: id }, '未找到微博搜索任务，忽略进度更新');
        return;
      }

      const updates: Partial<WeiboSearchTaskEntity> = {};

      if (progress.latestCrawlTime) {
        updates.latestCrawlTime = progress.latestCrawlTime;
      }

      if (progress.nextRunAt) {
        updates.nextRunAt = progress.nextRunAt;
      }

      if (Object.keys(updates).length > 0) {
        await taskRepo.update(id, updates);
      }
    });
  }

  private calculateNextRun(interval: string): Date {
    const now = new Date();
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) {
      return now;
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multiplier = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    } as const;

    const step = multiplier[unit as keyof typeof multiplier];
    if (!step) {
      return now;
    }

    return new Date(now.getTime() + value * step);
  }

  async createSubTask(taskId: number, payload: Partial<WeiboSubTaskEntity>): Promise<WeiboSubTaskEntity> {
    return useEntityManager(async (m) => {
      const taskRepo = m.getRepository(WeiboSearchTaskEntity);
      const subTaskRepo = m.getRepository(WeiboSubTaskEntity);

      const task = await taskRepo.findOne({ where: { id: taskId } });
      if (!task) {
        throw new NotFoundException('关联的微博搜索任务不存在');
      }

      const subTask = new WeiboSubTaskEntity();
      subTask.taskId = taskId;
      subTask.metadata = payload.metadata ?? {};
      subTask.type = payload.type ?? 'KEYWORD_SEARCH';
      subTask.status = payload.status ?? 'PENDING';

      return subTaskRepo.save(subTask);
    });
  }

  async listSubTasks(
    taskId: number,
    filter: QueryWeiboSubTaskDto = new QueryWeiboSubTaskDto(),
  ): Promise<{
    subTasks: WeiboSubTaskEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return useEntityManager(async (m) => {
      const {
        page = 1,
        limit = 10,
        type,
        status,
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = filter;

      const qb = m.getRepository(WeiboSubTaskEntity)
        .createQueryBuilder('subTask')
        .where('subTask.taskId = :taskId', { taskId });

      if (type) {
        qb.andWhere('subTask.type = :type', { type });
      }

      if (status) {
        qb.andWhere('subTask.status = :status', { status });
      }

      if (createdAfter) {
        qb.andWhere('subTask.createdAt >= :createdAfter', {
          createdAfter: new Date(createdAfter),
        });
      }

      if (createdBefore) {
        qb.andWhere('subTask.createdAt <= :createdBefore', {
          createdBefore: new Date(createdBefore),
        });
      }

      if (updatedAfter) {
        qb.andWhere('subTask.updatedAt >= :updatedAfter', {
          updatedAfter: new Date(updatedAfter),
        });
      }

      if (updatedBefore) {
        qb.andWhere('subTask.updatedAt <= :updatedBefore', {
          updatedBefore: new Date(updatedBefore),
        });
      }

      const availableSortFields = new Set(['createdAt', 'updatedAt', 'id', 'type', 'status']);
      const safeSortField = availableSortFields.has(sortBy ?? '') ? sortBy! : 'createdAt';
      const order = (sortOrder ?? 'DESC').toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(`subTask.${safeSortField}`, order as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      qb.skip(offset).take(limit);

      const [subTasks, total] = await qb.getManyAndCount();

      return {
        subTasks,
        total,
        page,
        limit,
      };
    });
  }

  async findSubTasksWithPagination(
    userId: string,
    taskId: number,
    filter: QueryWeiboSubTaskDto = new QueryWeiboSubTaskDto(),
  ): Promise<{
    subTasks: WeiboSubTaskEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.findOne(userId, taskId);
    return this.listSubTasks(taskId, filter);
  }

  async findSubTaskById(userId: string, id: number): Promise<WeiboSubTaskEntity> {
    return useEntityManager(async (m) => {
      const subTask = await m.getRepository(WeiboSubTaskEntity).findOne({
        where: { id },
        relations: ['task'],
      });

      if (!subTask) {
        throw new NotFoundException('微博搜索子任务不存在');
      }

      if (!subTask.task || subTask.task.userId !== userId) {
        throw new ForbiddenException('无权访问该子任务');
      }

      return subTask;
    });
  }
}
