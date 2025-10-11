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
import { ApiKeyService } from './api-key.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyQueryDto,
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  RegenerateApiKeyDto,
  ApiKeyStatsDto,
  ApiKeySummaryStatsDto
} from './dto/api-key.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyOwnerGuard } from './guards/api-key-owner.guard';
import { User, ApiKey } from '@pro/types';

/**
 * API Key 管理控制器 - 简化版本（无Swagger装饰器）
 */
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * 创建新的API Key
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req,
    @Body() createDto: CreateApiKeyDto,
    @Ip() ip: string,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.createApiKey(req.user.userId, createDto, ip);
  }

  /**
   * 获取用户的API Key列表（支持分页和过滤）
   */
  @Get()
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
  async findOne(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.getUserApiKeyById(req.user.userId, id);
  }

  /**
   * 更新API Key
   */
  @Put(':id')
  @UseGuards(ApiKeyOwnerGuard)
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.updateApiKey(req.user.userId, id, updateDto);
  }

  /**
   * 禁用API Key
   */
  @Put(':id/disable')
  @UseGuards(ApiKeyOwnerGuard)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.apiKeyService.deleteApiKey(req.user.userId, id);
  }

  /**
   * 获取用户API Key汇总统计
   */
  @Get('summary/stats')
  async getSummaryStats(@Request() req): Promise<ApiKeySummaryStatsDto> {
    return this.apiKeyService.getUserApiKeysSummaryStats(req.user.userId);
  }

  /**
   * 获取API Key使用统计
   */
  @Get(':id/stats')
  @UseGuards(ApiKeyOwnerGuard)
  async getStats(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiKeyStatsDto> {
    return this.apiKeyService.getApiKeyStats(req.user.userId, id);
  }

  /**
   * 重新生成API Key
   */
  @Post(':id/regenerate')
  @UseGuards(ApiKeyOwnerGuard)
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