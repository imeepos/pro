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
    const task = await this.taskService.create(userId, dto);
    return {
      success: true,
      data: task,
      message: '微博搜索任务创建成功',
    };
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
    const task = await this.taskService.findOne(userId, id);
    return {
      success: true,
      data: task,
      message: '获取任务详情成功',
    };
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
    const task = await this.taskService.update(userId, id, dto);
    return {
      success: true,
      data: task,
      message: '任务更新成功',
    };
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
    const task = await this.taskService.pause(userId, id, dto);
    return {
      success: true,
      data: task,
      message: '任务暂停成功',
    };
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
    const task = await this.taskService.resume(userId, id, dto);
    return {
      success: true,
      data: task,
      message: '任务恢复成功',
    };
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
    const task = await this.taskService.runNow(userId, id, dto);
    return {
      success: true,
      data: task,
      message: '任务已触发立即执行',
    };
  }

  /**
   * 批量暂停所有任务
   */
  @Post('pause-all')
  async pauseAll(@Request() req) {
    const userId = req.user.userId;
    const affectedCount = await this.taskService.pauseAllTasks(userId);
    return {
      success: true,
      data: { affectedCount },
      message: `已暂停 ${affectedCount} 个任务`,
    };
  }

  /**
   * 批量恢复所有任务
   */
  @Post('resume-all')
  async resumeAll(@Request() req) {
    const userId = req.user.userId;
    const affectedCount = await this.taskService.resumeAllTasks(userId);
    return {
      success: true,
      data: { affectedCount },
      message: `已恢复 ${affectedCount} 个任务`,
    };
  }

  /**
   * 获取任务统计信息
   */
  @Get('stats/overview')
  async getStats(@Request() req) {
    const userId = req.user.userId;
    const stats = await this.taskService.getTaskStats(userId);
    return {
      success: true,
      data: stats,
      message: '获取统计信息成功',
    };
  }

  /**
   * 获取任务状态选项
   */
  @Get('status/options')
  async getStatusOptions() {
    const statusOptions = Object.values(WeiboSearchTaskStatus).map(status => ({
      value: status,
      label: {
        [WeiboSearchTaskStatus.PENDING]: '等待执行',
        [WeiboSearchTaskStatus.RUNNING]: '正在执行',
        [WeiboSearchTaskStatus.PAUSED]: '已暂停',
        [WeiboSearchTaskStatus.FAILED]: '执行失败',
        [WeiboSearchTaskStatus.TIMEOUT]: '执行超时',
      }[status],
    }));

    return {
      success: true,
      data: statusOptions,
      message: '获取状态选项成功',
    };
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
    const task = await this.taskService.findOne(userId, id);
    return {
      success: true,
      data: task,
      message: '获取任务详情成功',
    };
  }
}