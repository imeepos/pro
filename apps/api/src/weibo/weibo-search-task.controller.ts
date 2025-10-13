import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import {
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  QueryTaskDto,
  PauseTaskDto,
  ResumeTaskDto,
  RunNowTaskDto,
} from './dto/weibo-search-task.dto';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

/**
 * 微博搜索任务控制器
 * 提供微博搜索任务的完整RESTful API
 */
@Controller('weibo-search-tasks')
@UseGuards(JwtAuthGuard)
export class WeiboSearchTaskController {
  constructor(private readonly taskService: WeiboSearchTaskService) {}

  /**
   * 创建微博搜索任务
   */
  @Post()
  async create(@Request() req, @Body() dto: CreateWeiboSearchTaskDto) {
    const userId = req.user.userId;
    return await this.taskService.create(userId, dto);
  }

  /**
   * 获取微博搜索任务列表
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req, @Query() query: QueryTaskDto) {
    const userId = req.user.userId;
    const result = await this.taskService.findAll(userId, query);

    // 计算总页数
    const totalPages = Math.ceil(result.total / result.limit);

    return {
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
    };
  }

  /**
   * 获取单个微博搜索任务详情
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return await this.taskService.findOne(userId, id);
  }

  /**
   * 更新微博搜索任务
   */
  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWeiboSearchTaskDto
  ) {
    const userId = req.user.userId;
    return await this.taskService.update(userId, id, dto);
  }

  /**
   * 删除微博搜索任务
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    await this.taskService.delete(userId, id);
  }

  /**
   * 暂停微博搜索任务
   */
  @Post(':id/pause')
  async pause(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: PauseTaskDto
  ) {
    const userId = req.user.userId;
    return await this.taskService.pause(userId, id, dto);
  }

  /**
   * 恢复微博搜索任务
   */
  @Post(':id/resume')
  async resume(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: ResumeTaskDto
  ) {
    const userId = req.user.userId;
    return await this.taskService.resume(userId, id, dto);
  }

  /**
   * 立即执行微博搜索任务
   */
  @Post(':id/run-now')
  async runNow(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: RunNowTaskDto
  ) {
    const userId = req.user.userId;
    return await this.taskService.runNow(userId, id, dto);
  }

  /**
   * 批量暂停所有任务
   */
  @Post('pause-all')
  async pauseAll(@Request() req) {
    const userId = req.user.userId;
    const affectedCount = await this.taskService.pauseAllTasks(userId);
    return { affectedCount };
  }

  /**
   * 批量恢复所有任务
   */
  @Post('resume-all')
  async resumeAll(@Request() req) {
    const userId = req.user.userId;
    const affectedCount = await this.taskService.resumeAllTasks(userId);
    return { affectedCount };
  }

  /**
   * 获取任务统计信息
   */
  @Get('stats/overview')
  async getStats(@Request() req) {
    const userId = req.user.userId;
    return await this.taskService.getTaskStats(userId);
  }

  /**
   * 获取任务状态选项
   */
  @Get('status/options')
  async getStatusOptions() {
    return Object.values(WeiboSearchTaskStatus).map(status => ({
      value: status,
      label: {
        [WeiboSearchTaskStatus.PENDING]: '等待执行',
        [WeiboSearchTaskStatus.RUNNING]: '正在执行',
        [WeiboSearchTaskStatus.PAUSED]: '已暂停',
        [WeiboSearchTaskStatus.FAILED]: '执行失败',
        [WeiboSearchTaskStatus.TIMEOUT]: '执行超时',
      }[status],
    }));
  }

  /**
   * 测试专用：获取微博搜索任务列表（支持API Key认证）
   */
  @Get('test/list')
  @UseGuards(ApiKeyAuthGuard)
  async testFindAll(@Request() req, @Query() query: QueryTaskDto) {
    const userId = req.user.userId;
    const result = await this.taskService.findAll(userId, query);

    // 计算总页数
    const totalPages = Math.ceil(result.total / result.limit);

    return {
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
    };
  }

  /**
   * 测试专用：获取单个微博搜索任务详情（支持API Key认证）
   */
  @Get('test/:id')
  @UseGuards(ApiKeyAuthGuard)
  async testFindOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return await this.taskService.findOne(userId, id);
  }
}