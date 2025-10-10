import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyQueryDto,
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  RegenerateApiKeyDto
} from './dto/api-key.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyOwnerGuard } from '../guards/api-key-owner.guard';
import { ApiKeyRateLimitGuard } from '../guards/api-key-rate-limit.guard';
import { ApiKey, User } from '@pro/types';

/**
 * API Key 管理控制器
 * 提供完整的API Key CRUD操作和管理功能
 */
@ApiTags('API Key Management')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * 创建新的API Key
   */
  @Post()
  @UseGuards(ApiKeyRateLimitGuard)
  @ApiOperation({ summary: '创建新的API Key', description: '为当前用户创建一个新的API Key' })
  @ApiResponse({ status: 201, description: 'API Key创建成功', type: ApiKeyResponseDto })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: 'API Key数量已达上限或创建频率过高' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req,
    @Body() createDto: CreateApiKeyDto,
    @Ip() ip: string,
  ): Promise<ApiKey> {
    return this.apiKeyService.createApiKey(req.user.userId, createDto, ip);
  }

  /**
   * 获取用户的API Key列表（支持分页和过滤）
   */
  @Get()
  @ApiOperation({ summary: '获取API Key列表', description: '获取当前用户的API Key列表，支持分页、搜索和过滤' })
  @ApiResponse({ status: 200, description: '获取成功', type: ApiKeyListResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量，默认10，最大100' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '搜索关键词' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'expired', 'all'], description: 'API Key状态' })
  @ApiQuery({ name: 'includeExpired', required: false, type: Boolean, description: '是否包含已过期的Key' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'name', 'lastUsedAt', 'usageCount'], description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: '排序方向' })
  async findAll(
    @Request() req,
    @Query() query: ApiKeyQueryDto,
  ): Promise<ApiKeyListResponseDto> {
    return this.apiKeyService.getUserApiKeysPaginated(req.user.userId, query);
  }

  /**
   * 获取单个API Key详情
   */
  @Get(':id')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '获取API Key详情', description: '根据ID获取单个API Key的详细信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: ApiKeyResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  async findOne(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiKey> {
    return this.apiKeyService.getUserApiKeyById(req.user.userId, id);
  }

  /**
   * 更新API Key
   */
  @Put(':id')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '更新API Key', description: '更新指定API Key的信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: ApiKeyResponseDto })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateApiKeyDto,
  ): Promise<ApiKey> {
    return this.apiKeyService.updateApiKey(req.user.userId, id, updateDto);
  }

  /**
   * 禁用API Key
   */
  @Put(':id/disable')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '禁用API Key', description: '禁用指定的API Key' })
  @ApiResponse({ status: 204, description: '禁用成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.apiKeyService.disableApiKey(req.user.userId, id);
  }

  /**
   * 启用API Key
   */
  @Put(':id/enable')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '启用API Key', description: '启用指定的API Key' })
  @ApiResponse({ status: 204, description: '启用成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  @HttpCode(HttpStatus.NO_CONTENT)
  async enable(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.apiKeyService.enableApiKey(req.user.userId, id);
  }

  /**
   * 删除API Key
   */
  @Delete(':id')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '删除API Key', description: '永久删除指定的API Key' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.apiKeyService.deleteApiKey(req.user.userId, id);
  }

  /**
   * 获取API Key使用统计
   */
  @Get(':id/stats')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '获取API Key使用统计', description: '获取指定API Key的详细使用统计信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: 'object' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  async getStats(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ usageCount: number; lastUsedAt: Date; createdAt: Date }> {
    return this.apiKeyService.getApiKeyStats(req.user.userId, id);
  }

  /**
   * 重新生成API Key
   */
  @Post(':id/regenerate')
  @UseGuards(ApiKeyOwnerGuard)
  @ApiOperation({ summary: '重新生成API Key', description: '重新生成指定API Key的密钥字符串，旧密钥将立即失效' })
  @ApiResponse({ status: 201, description: '重新生成成功', type: RegenerateApiKeyDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限操作此API Key' })
  @ApiResponse({ status: 404, description: 'API Key不存在' })
  @ApiParam({ name: 'id', description: 'API Key ID', type: Number })
  @HttpCode(HttpStatus.CREATED)
  async regenerate(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Ip() ip: string,
  ): Promise<{ key: string }> {
    const newKey = await this.apiKeyService.regenerateApiKey(req.user.userId, id, ip);
    return { key: newKey };
  }
}