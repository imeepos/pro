import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  Bug,
  CreateBugDto,
  UpdateBugDto,
  BugFilters,
  BugComment,
  CreateBugCommentDto,
  ApiResponse as ApiResponseDto,
} from '@pro/types';
import { BugService } from './bug.service';
import { BugCommentService } from './bug-comment.service';
import { BugAttachmentService } from './bug-attachment.service';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('Bug管理')
@Controller('bugs')
export class BugController {
  private readonly logger = new Logger(BugController.name);

  constructor(
    private readonly bugService: BugService,
    private readonly commentService: BugCommentService,
    private readonly attachmentService: BugAttachmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建Bug' })
  @ApiResponse({ status: 201, description: 'Bug创建成功' })
  async createBug(@Body() createBugDto: CreateBugDto): Promise<ApiResponseDto<Bug>> {
    this.logger.log(`创建Bug: ${createBugDto.title}`);
    const bug = await this.bugService.create(createBugDto);
    return {
      success: true,
      data: bug,
      message: 'Bug创建成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: '获取Bug列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'assigneeId', required: false, type: String })
  async getBugs(@Query() filters: BugFilters): Promise<ApiResponseDto<{ bugs: Bug[]; total: number }>> {
    this.logger.log(`查询Bug列表: ${JSON.stringify(filters)}`);
    const { bugs, total } = await this.bugService.findAll(filters);
    return {
      success: true,
      data: { bugs, total },
      message: '查询成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取Bug详情' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async getBug(
    @Param('id', new UuidValidationPipe()) id: string
  ): Promise<ApiResponseDto<Bug>> {
    this.logger.log(`获取Bug详情: ${id}`);
    const bug = await this.bugService.findOne(id);
    if (!bug) {
      throw new HttpException('Bug不存在', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      data: bug,
      message: '获取成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新Bug' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async updateBug(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body() updateBugDto: UpdateBugDto,
  ): Promise<ApiResponseDto<Bug>> {
    this.logger.log(`更新Bug: ${id}`);
    const bug = await this.bugService.update(id, updateBugDto);
    return {
      success: true,
      data: bug,
      message: '更新成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除Bug' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async deleteBug(
    @Param('id', new UuidValidationPipe()) id: string
  ): Promise<ApiResponseDto<null>> {
    this.logger.log(`删除Bug: ${id}`);
    await this.bugService.remove(id);
    return {
      success: true,
      data: null,
      message: '删除成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/comments')
  @ApiOperation({ summary: '添加评论' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async addComment(
    @Param('id', new UuidValidationPipe()) bugId: string,
    @Body() createCommentDto: CreateBugCommentDto,
  ): Promise<ApiResponseDto<BugComment>> {
    this.logger.log(`为Bug ${bugId} 添加评论`);
    const comment = await this.commentService.create(bugId, createCommentDto);
    return {
      success: true,
      data: comment,
      message: '评论添加成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取评论列表' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async getComments(
    @Param('id', new UuidValidationPipe()) bugId: string
  ): Promise<ApiResponseDto<BugComment[]>> {
    this.logger.log(`获取Bug ${bugId} 的评论`);
    const comments = await this.commentService.findByBugId(bugId);
    return {
      success: true,
      data: comments,
      message: '获取成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: '上传附件' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id', new UuidValidationPipe()) bugId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponseDto<any>> {
    if (!file) {
      throw new HttpException('请选择文件', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`为Bug ${bugId} 上传附件: ${file.originalname}`);
    const attachment = await this.attachmentService.create(bugId, file);
    return {
      success: true,
      data: attachment,
      message: '附件上传成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新Bug状态' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async updateStatus(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body() body: { status: string; comment?: string },
  ): Promise<ApiResponseDto<Bug>> {
    this.logger.log(`更新Bug ${id} 状态为: ${body.status}`);
    const bug = await this.bugService.updateStatus(id, body.status, body.comment);
    return {
      success: true,
      data: bug,
      message: '状态更新成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/assign')
  @ApiOperation({ summary: '分配Bug' })
  @ApiParam({ name: 'id', description: 'Bug ID' })
  async assignBug(
    @Param('id', new UuidValidationPipe()) id: string,
    @Body() body: { assigneeId: string },
  ): Promise<ApiResponseDto<Bug>> {
    this.logger.log(`分配Bug ${id} 给用户: ${body.assigneeId}`);
    const bug = await this.bugService.assign(id, body.assigneeId);
    return {
      success: true,
      data: bug,
      message: '分配成功',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('statistics/summary')
  @ApiOperation({ summary: '获取Bug统计信息' })
  async getStatistics(): Promise<ApiResponseDto<any>> {
    this.logger.log('获取Bug统计信息');
    const statistics = await this.bugService.getStatistics();
    return {
      success: true,
      data: statistics,
      message: '统计信息获取成功',
      timestamp: new Date().toISOString(),
    };
  }
}