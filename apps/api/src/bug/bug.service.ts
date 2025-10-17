import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import {
  Bug,
  CreateBugDto,
  UpdateBugDto,
  BugFilters,
  BugStatus,
  BugPriority,
  BugCategory,
  CreateBugCommentDto,
} from '@pro/types';
import { BugEntity } from '@pro/entities';
import { BugCommentService } from './bug-comment.service';
import { BugNotificationService } from './bug-notification.service';
import { UuidValidator } from './common/uuid.validator';

@Injectable()
export class BugService {
  private readonly logger = new Logger(BugService.name);

  constructor(
    @InjectRepository(BugEntity)
    private readonly bugRepository: Repository<BugEntity>,
    private readonly commentService: BugCommentService,
    private readonly notificationService: BugNotificationService,
  ) {}

  async create(createBugDto: CreateBugDto | any, userId?: string): Promise<Bug> {
    this.logger.log(`创建Bug: ${createBugDto.title}`);

    if (!createBugDto.reporterId) {
      throw new BadRequestException('Bug缺少报告者信息');
    }

    const bugEntity = this.bugRepository.create({
      ...createBugDto,
      status: BugStatus.OPEN,
      priority: createBugDto.priority || BugPriority.MEDIUM,
      reporterId: userId, // Set the reporter from the authenticated user
    });

    const savedBugResult = await this.bugRepository.save(bugEntity);
    const savedBug = Array.isArray(savedBugResult) ? savedBugResult[0] : savedBugResult;

    await this.notificationService.notifyBugCreated(savedBug);

    return this.mapEntityToDto(savedBug);
  }

  async findAll(filters: BugFilters | any): Promise<{ bugs: Bug[]; total: number }> {
    this.logger.log(`查询Bug列表: ${JSON.stringify(filters)}`);

    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assigneeId,
      reporterId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const where: FindOptionsWhere<BugEntity> = {};

    if (status && status.length > 0) where.status = status[0];
    if (priority && priority.length > 0) where.priority = priority[0];
    if (assigneeId) where.assigneeId = assigneeId;
    if (reporterId) where.reporterId = reporterId;
    if (search) {
      where.title = Like(`%${search}%`);
    }

    const [bugs, total] = await this.bugRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['reporter', 'assignee'],
    });

    return {
      bugs: bugs.map(bug => this.mapEntityToDto(bug)),
      total,
    };
  }

  async findOne(id: string): Promise<Bug> {
    this.logger.log(`获取Bug详情: ${id}`);

    // 验证 UUID 格式
    UuidValidator.validateWithIntelligence(id, 'Bug ID');

    const bug = await this.bugRepository.findOne({
      where: { id },
      relations: ['reporter', 'assignee', 'comments', 'attachments'],
    });

    if (!bug) {
      throw new NotFoundException('Bug不存在');
    }

    return this.mapEntityToDto(bug);
  }

  async update(id: string, updateBugDto: UpdateBugDto | any): Promise<Bug> {
    this.logger.log(`更新Bug: ${id}`);

    // 验证 UUID 格式
    UuidValidator.validateWithIntelligence(id, 'Bug ID');

    const bug = await this.bugRepository.findOne({ where: { id } });
    if (!bug) {
      throw new NotFoundException('Bug不存在');
    }

    const oldStatus = bug.status;

    await this.bugRepository.update(id, {
      ...updateBugDto,
      environment: updateBugDto.environment ? JSON.parse(JSON.stringify(updateBugDto.environment)) : undefined,
    });

    const updatedBug = await this.bugRepository.findOne({
      where: { id },
      relations: ['reporter', 'assignee'],
    });

    if (!updatedBug) {
      throw new NotFoundException('Bug不存在');
    }

    if (updateBugDto.status && updateBugDto.status !== oldStatus) {
      await this.commentService.create(id, {
        content: `状态从 ${oldStatus} 变更为 ${updateBugDto.status}`,
      });

      await this.notificationService.notifyStatusChange(updatedBug, oldStatus, updateBugDto.status);
    }

    return this.mapEntityToDto(updatedBug);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`删除Bug: ${id}`);

    // 验证 UUID 格式
    UuidValidator.validateWithIntelligence(id, 'Bug ID');

    const bug = await this.bugRepository.findOne({ where: { id } });
    if (!bug) {
      throw new NotFoundException('Bug不存在');
    }

    await this.bugRepository.remove(bug);
  }

  async updateStatus(id: string, status: string, comment?: string): Promise<Bug> {
    this.logger.log(`更新Bug ${id} 状态为: ${status}`);

    // 验证 UUID 格式
    UuidValidator.validateWithIntelligence(id, 'Bug ID');

    const bug = await this.update(id, { status: status as BugStatus });

    if (comment) {
      await this.commentService.create(id, {
        content: comment,
      });
    }

    return bug;
  }

  async assign(id: string, assigneeId: string): Promise<Bug> {
    this.logger.log(`分配Bug ${id} 给用户: ${assigneeId}`);

    // 验证 UUID 格式
    UuidValidator.validateWithIntelligence(id, 'Bug ID');

    const bug = await this.update(id, { assigneeId });

    await this.commentService.create(id, {
      content: `Bug已分配给用户 ${assigneeId}`,
    });

    await this.notificationService.notifyBugAssigned(bug, assigneeId);

    return bug;
  }

  async getStatistics(): Promise<any> {
    this.logger.log('获取Bug统计信息');

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      rejected,
      reopened,
      low,
      medium,
      high,
      critical,
      functional,
      performance,
      security,
      uiUx,
      integration,
      data,
      configuration,
      documentation,
    ] = await Promise.all([
      this.bugRepository.count(),
      this.bugRepository.count({ where: { status: BugStatus.OPEN } }),
      this.bugRepository.count({ where: { status: BugStatus.IN_PROGRESS } }),
      this.bugRepository.count({ where: { status: BugStatus.RESOLVED } }),
      this.bugRepository.count({ where: { status: BugStatus.CLOSED } }),
      this.bugRepository.count({ where: { status: BugStatus.REJECTED } }),
      this.bugRepository.count({ where: { status: BugStatus.REOPENED } }),
      this.bugRepository.count({ where: { priority: BugPriority.LOW } }),
      this.bugRepository.count({ where: { priority: BugPriority.MEDIUM } }),
      this.bugRepository.count({ where: { priority: BugPriority.HIGH } }),
      this.bugRepository.count({ where: { priority: BugPriority.CRITICAL } }),
      this.bugRepository.count({ where: { category: BugCategory.FUNCTIONAL } }),
      this.bugRepository.count({ where: { category: BugCategory.PERFORMANCE } }),
      this.bugRepository.count({ where: { category: BugCategory.SECURITY } }),
      this.bugRepository.count({ where: { category: BugCategory.UI_UX } }),
      this.bugRepository.count({ where: { category: BugCategory.INTEGRATION } }),
      this.bugRepository.count({ where: { category: BugCategory.DATA } }),
      this.bugRepository.count({ where: { category: BugCategory.CONFIGURATION } }),
      this.bugRepository.count({ where: { category: BugCategory.DOCUMENTATION } }),
    ]);

    return {
      total,
      byStatus: {
        open,
        inProgress,
        resolved,
        closed,
        rejected,
        reopened,
      },
      byPriority: {
        low,
        medium,
        high,
        critical,
      },
      byCategory: {
        functional,
        performance,
        security,
        uiUx,
        integration,
        data,
        configuration,
        documentation,
      },
    };
  }

  private mapEntityToDto(entity: BugEntity): Bug {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      category: entity.category,
      reporterId: this.resolveReporterId(entity),
      assigneeId: entity.assigneeId,
      environment: entity.environment,
      stepsToReproduce: entity.stepsToReproduce,
      expectedBehavior: entity.expectedBehavior,
      actualBehavior: entity.actualBehavior,
      reproductionRate: entity.reproductionRate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      resolvedAt: entity.resolvedAt,
      resolvedBy: entity.resolvedBy,
      closedAt: entity.closedAt,
      closedBy: entity.closedBy,
      dueDate: entity.dueDate,
      estimatedHours: entity.estimatedHours,
      actualHours: entity.actualHours,
      attachments: [],
      comments: [],
      tags: [],
    };
  }

  private resolveReporterId(entity: BugEntity): string {
    if (entity.reporterId) {
      return entity.reporterId;
    }

    if (entity.reporter?.id) {
      return entity.reporter.id;
    }

    this.logger.warn(`Bug ${entity.id} 缺少 reporterId，将返回空字符串占位`);
    return '';
  }
}
