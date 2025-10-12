import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import {
  WeiboSearchTaskEntity,
  WeiboSearchTaskStatus,
} from '@pro/entities';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
import {
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  QueryTaskDto,
  PauseTaskDto,
  ResumeTaskDto,
  RunNowTaskDto,
} from './dto/weibo-search-task.dto';

/**
 * 微博搜索任务服务
 * 负责微博搜索任务的完整生命周期管理
 */
@Injectable()
export class WeiboSearchTaskService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(WeiboSearchTaskService.name);
  }

  /**
   * 创建微博搜索任务
   * 自动设置默认值并验证账号可用性
   */
  async create(userId: string, dto: CreateWeiboSearchTaskDto): Promise<WeiboSearchTaskEntity> {
    this.logger.info(`用户 ${userId} 创建微博搜索任务: ${dto.keyword}`);

    // 验证指定的微博账号是否存在且可用
    if (dto.weiboAccountId) {
      await this.validateWeiboAccount(dto.weiboAccountId, userId);
    }

    // 验证起始时间不能是未来时间
    const startDate = new Date(dto.startDate);
    if (startDate > new Date()) {
      throw new BadRequestException('监控起始时间不能是未来时间');
    }

    const task = this.taskRepo.create({
      ...dto,
      userId,
      startDate,
      enabled: true,
      status: WeiboSearchTaskStatus.PENDING,
      nextRunAt: new Date(), // 立即开始执行
      progress: 0,
      totalSegments: this.estimateTotalSegments(startDate, new Date()),
      retryCount: 0,
      noDataCount: 0,
    });

    const savedTask = await this.taskRepo.save(task);
    this.logger.info(`任务创建成功: ID=${savedTask.id}, 关键词=${savedTask.keyword}`);

    return savedTask;
  }

  /**
   * 查询用户的微博搜索任务列表
   * 支持分页、筛选和排序
   */
  async findAll(userId: string, query: QueryTaskDto): Promise<{
    tasks: WeiboSearchTaskEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      keyword,
      status,
      enabled,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.weiboAccount', 'weiboAccount')
      .where('task.userId = :userId', { userId });

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere('task.keyword ILIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    // 启用状态筛选
    if (typeof enabled === 'boolean') {
      queryBuilder.andWhere('task.enabled = :enabled', { enabled });
    }

    // 排序（转换为大写）
    const order = (sortOrder?.toUpperCase() || 'DESC') as 'ASC' | 'DESC';

    // 处理排序字段
    const allowedSortFields = [
      'createdAt', 'updatedAt', 'startDate', 'nextRunAt',
      'progress', 'longitude', 'latitude', 'locationAddress', 'locationName'
    ];

    const safeSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`task.${safeSortField}`, order);

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      tasks,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取单个微博搜索任务详情
   */
  async findOne(userId: string, id: number): Promise<WeiboSearchTaskEntity> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['weiboAccount'],
    });

    if (!task) {
      throw new NotFoundException('微博搜索任务不存在');
    }

    // 权限验证：只能查看自己的任务
    if (task.userId !== userId) {
      throw new ForbiddenException('无权访问此任务');
    }

    return task;
  }

  /**
   * 更新微博搜索任务
   * 支持部分更新和状态重置
   */
  async update(userId: string, id: number, dto: UpdateWeiboSearchTaskDto): Promise<WeiboSearchTaskEntity> {
    const task = await this.findOne(userId, id);

    // 验证新的微博账号
    if (dto.weiboAccountId && dto.weiboAccountId !== task.weiboAccountId) {
      await this.validateWeiboAccount(dto.weiboAccountId, userId);
    }

    // 验证起始时间
    if (dto.startDate) {
      const startDate = new Date(dto.startDate);
      if (startDate > new Date()) {
        throw new BadRequestException('监控起始时间不能是未来时间');
      }
    }

    // 如果修改了关键词或起始时间，重新估算总段数
    const needsReEstimation = dto.keyword || dto.startDate;
    if (needsReEstimation) {
      const keyword = dto.keyword || task.keyword;
      const startDate = dto.startDate ? new Date(dto.startDate) : task.startDate;
      dto.totalSegments = this.estimateTotalSegments(startDate, new Date());
    }

    // 重置计数器
    const updates: any = { ...dto };
    if (dto.resetRetryCount) {
      updates.retryCount = 0;
      delete updates.resetRetryCount;
    }
    if (dto.resetNoDataCount) {
      updates.noDataCount = 0;
      delete updates.resetNoDataCount;
    }

    // 清除错误信息（如果从失败状态恢复）
    if (dto.status && dto.status !== WeiboSearchTaskStatus.FAILED) {
      updates.errorMessage = null;
    }

    await this.taskRepo.update(id, updates);
    this.logger.info(`任务更新成功: ID=${id}, 更新字段: ${Object.keys(updates).join(', ')}`);

    return this.findOne(userId, id);
  }

  /**
   * 删除微博搜索任务
   */
  async delete(userId: string, id: number): Promise<void> {
    const task = await this.findOne(userId, id);

    // 检查任务是否正在执行
    if (task.status === WeiboSearchTaskStatus.RUNNING) {
      throw new BadRequestException('无法删除正在执行的任务，请先暂停任务');
    }

    await this.taskRepo.delete(id);
    this.logger.info(`任务删除成功: ID=${id}, 关键词=${task.keyword}`);
  }

  /**
   * 暂停微博搜索任务
   */
  async pause(userId: string, id: number, dto?: PauseTaskDto): Promise<WeiboSearchTaskEntity> {
    const task = await this.findOne(userId, id);

    if (!task.enabled) {
      throw new BadRequestException('任务已经是暂停状态');
    }

    await this.taskRepo.update(id, {
      enabled: false,
      errorMessage: dto?.reason || task.errorMessage,
    });

    this.logger.info(`任务暂停: ID=${id}, 原因: ${dto?.reason || '手动暂停'}`);

    return this.findOne(userId, id);
  }

  /**
   * 恢复微博搜索任务
   */
  async resume(userId: string, id: number, dto?: ResumeTaskDto): Promise<WeiboSearchTaskEntity> {
    const task = await this.findOne(userId, id);

    if (task.enabled) {
      throw new BadRequestException('任务已经是启用状态');
    }

    // 重置错误信息和无数据计数
    await this.taskRepo.update(id, {
      enabled: true,
      nextRunAt: new Date(), // 立即重新开始
      errorMessage: null,
      noDataCount: 0,
    });

    this.logger.info(`任务恢复: ID=${id}, 原因: ${dto?.reason || '手动恢复'}`);

    return this.findOne(userId, id);
  }

  /**
   * 立即执行微博搜索任务
   */
  async runNow(userId: string, id: number, dto?: RunNowTaskDto): Promise<WeiboSearchTaskEntity> {
    const task = await this.findOne(userId, id);

    // 如果任务被暂停，自动启用
    const updates: Partial<WeiboSearchTaskEntity> = {
      nextRunAt: new Date(), // 设置为当前时间，立即执行
      status: WeiboSearchTaskStatus.PENDING, // 重置为待执行状态
      errorMessage: null, // 清除错误信息
    };

    if (!task.enabled) {
      updates.enabled = true;
      updates.noDataCount = 0; // 重置无数据计数
    }

    await this.taskRepo.update(id, updates);

    this.logger.info(`任务立即执行: ID=${id}, 原因: ${dto?.reason || '手动触发'}`);

    return this.findOne(userId, id);
  }

  /**
   * 批量暂停用户的所有任务
   */
  async pauseAllTasks(userId: string): Promise<number> {
    const result = await this.taskRepo.update(
      { userId, enabled: true },
      { enabled: false }
    );

    this.logger.info(`用户 ${userId} 的所有任务已暂停，影响行数: ${result.affected}`);

    return result.affected || 0;
  }

  /**
   * 批量恢复用户的所有任务
   */
  async resumeAllTasks(userId: string): Promise<number> {
    const result = await this.taskRepo.update(
      { userId, enabled: false },
      {
        enabled: true,
        nextRunAt: new Date(),
        errorMessage: null,
        noDataCount: 0,
      }
    );

    this.logger.info(`用户 ${userId} 的所有任务已恢复，影响行数: ${result.affected}`);

    return result.affected || 0;
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(userId: string): Promise<{
    total: number;
    enabled: number;
    running: number;
    paused: number;
    failed: number;
    completed: number;
  }> {
    const [total, enabled, running, paused, failed] = await Promise.all([
      this.taskRepo.count({ where: { userId } }),
      this.taskRepo.count({ where: { userId, enabled: true } }),
      this.taskRepo.count({
        where: { userId, status: WeiboSearchTaskStatus.RUNNING }
      }),
      this.taskRepo.count({
        where: { userId, enabled: false }
      }),
      this.taskRepo.count({
        where: { userId, status: WeiboSearchTaskStatus.FAILED }
      }),
    ]);

    // 已完成=历史回溯完成的任务
    const completed = await this.taskRepo
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere('task.currentCrawlTime IS NOT NULL')
      .andWhere('task.currentCrawlTime <= task.startDate')
      .getCount();

    return {
      total,
      enabled,
      running,
      paused,
      failed,
      completed,
    };
  }

  /**
   * 验证微博账号的可用性和权限
   */
  private async validateWeiboAccount(accountId: number, userId: string): Promise<void> {
    const account = await this.weiboAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestException('指定的微博账号不存在');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('无权使用此微博账号');
    }

    if (account.status !== WeiboAccountStatus.ACTIVE) {
      throw new BadRequestException('指定的微博账号状态异常，无法使用');
    }
  }

  /**
   * 估算总段数
   * 基于时间跨度简单估算，用于进度显示
   */
  private estimateTotalSegments(startDate: Date, endDate: Date): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // 假设每个时间段平均包含3天的数据
    return Math.max(1, Math.ceil(diffDays / 3));
  }

  /**
   * 获取待执行的任务列表（供broker使用）
   * 返回所有启用且到达执行时间的任务
   */
  async getPendingTasks(): Promise<WeiboSearchTaskEntity[]> {
    return this.taskRepo.find({
      where: {
        enabled: true,
        nextRunAt: LessThanOrEqual(new Date()),
      },
      relations: ['weiboAccount'],
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * 更新任务执行状态（供broker/crawler使用）
   */
  async updateTaskStatus(
    id: number,
    status: WeiboSearchTaskStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: Partial<WeiboSearchTaskEntity> = { status };

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (status === WeiboSearchTaskStatus.RUNNING) {
      updates.errorMessage = null;
    }

    await this.taskRepo.update(id, updates);
  }

  /**
   * 更新任务进度（供crawler使用）
   */
  async updateTaskProgress(
    id: number,
    progress: {
      currentCrawlTime?: Date;
      latestCrawlTime?: Date;
      nextRunAt?: Date;
      progress?: number;
      noDataCount?: number;
    }
  ): Promise<void> {
    await this.taskRepo.update(id, progress);
  }
}