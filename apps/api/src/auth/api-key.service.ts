import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, SelectQueryBuilder } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { UserEntity } from '../entities/user.entity';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyQueryDto,
  ApiKeyListResponseDto,
  ApiKeyResponseDto,
  ApiKeyStatus,
  ApiKeyStatsDto
} from './dto/api-key.dto';

/**
 * API Key 管理服务
 * 提供API Key的创建、验证、禁用等功能
 */
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * 为用户创建新的API Key
   */
  async createApiKey(userId: string, createDto: CreateApiKeyDto, createdIp?: string): Promise<ApiKeyEntity> {
    // 验证用户存在
    const user = await this.userRepo.findOne({ where: { id: userId, status: 'active' } });
    if (!user) {
      throw new NotFoundException('用户不存在或已被禁用');
    }

    // 检查用户是否已有太多API Key（限制10个）
    const existingCount = await this.apiKeyRepo.count({ where: { userId, isActive: true } });
    if (existingCount >= 10) {
      throw new UnauthorizedException('每个用户最多只能创建10个有效的API Key');
    }

    // 生成新的API Key
    const key = ApiKeyEntity.generateKey();

    const apiKey = this.apiKeyRepo.create({
      key,
      userId,
      name: createDto.name,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
      createdIp,
    });

    const savedApiKey = await this.apiKeyRepo.save(apiKey);

    // 不返回完整的key，只返回前缀和后几位
    savedApiKey.key = `${savedApiKey.key.substring(0, 7)}...${savedApiKey.key.substring(-4)}`;

    return savedApiKey;
  }

  /**
   * 验证API Key并返回用户信息
   */
  async validateApiKey(key: string): Promise<{ user: UserEntity; apiKey: ApiKeyEntity }> {
    const apiKeyEntity = await this.apiKeyRepo.findOne({
      where: { key, isActive: true },
      relations: ['user'],
    });

    if (!apiKeyEntity) {
      throw new UnauthorizedException('API Key 无效或已禁用');
    }

    if (apiKeyEntity.isExpired) {
      throw new UnauthorizedException('API Key 已过期');
    }

    if (apiKeyEntity.user.status !== 'active') {
      throw new UnauthorizedException('用户账户已被禁用');
    }

    // 更新使用统计
    await this.apiKeyRepo.update(apiKeyEntity.id, {
      lastUsedAt: new Date(),
      usageCount: apiKeyEntity.usageCount + 1,
    });

    return {
      user: apiKeyEntity.user,
      apiKey: apiKeyEntity,
    };
  }

  /**
   * 获取用户的所有API Key
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyEntity[]> {
    const apiKeys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 隐藏完整的key
    return apiKeys.map(key => ({
      ...key,
      key: `${key.key.substring(0, 7)}...${key.key.substring(-4)}`,
    }));
  }

  /**
   * 禁用API Key
   */
  async disableApiKey(userId: string, keyId: number): Promise<void> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    await this.apiKeyRepo.update(keyId, { isActive: false });
  }

  /**
   * 更新API Key
   */
  async updateApiKey(userId: string, keyId: number, updateDto: UpdateApiKeyDto): Promise<ApiKeyEntity> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    await this.apiKeyRepo.update(keyId, updateDto);

    const updatedApiKey = await this.apiKeyRepo.findOne({ where: { id: keyId } });
    updatedApiKey.key = `${updatedApiKey.key.substring(0, 7)}...${updatedApiKey.key.substring(-4)}`;

    return updatedApiKey;
  }

  /**
   * 删除API Key
   */
  async deleteApiKey(userId: string, keyId: number): Promise<void> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    await this.apiKeyRepo.delete(keyId);
  }

  /**
   * 分页获取用户的API Key列表（支持搜索和过滤）
   */
  async getUserApiKeysPaginated(
    userId: string,
    query: ApiKeyQueryDto,
  ): Promise<ApiKeyListResponseDto> {
    const { page = 1, limit = 10, search, status, includeExpired = false, sortBy, sortOrder, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    // 构建查询
    let queryBuilder: SelectQueryBuilder<ApiKeyEntity> = this.apiKeyRepo
      .createQueryBuilder('apiKey')
      .where('apiKey.userId = :userId', { userId });

    // 搜索条件
    if (search) {
      queryBuilder = queryBuilder.andWhere('apiKey.name LIKE :search', { search: `%${search}%` });
    }

    // 状态过滤
    if (status && status !== ApiKeyStatus.ALL) {
      switch (status) {
        case ApiKeyStatus.ACTIVE:
          queryBuilder = queryBuilder.andWhere('apiKey.isActive = :isActive', { isActive: true });
          if (!includeExpired) {
            queryBuilder = queryBuilder.andWhere('(apiKey.expiresAt IS NULL OR apiKey.expiresAt > :now)', { now: new Date() });
          }
          break;
        case ApiKeyStatus.INACTIVE:
          queryBuilder = queryBuilder.andWhere('apiKey.isActive = :isActive', { isActive: false });
          break;
        case ApiKeyStatus.EXPIRED:
          queryBuilder = queryBuilder.andWhere('apiKey.expiresAt IS NOT NULL AND apiKey.expiresAt <= :now', { now: new Date() });
          break;
      }
    } else if (!includeExpired) {
      // 默认情况下不显示已过期的Key
      queryBuilder = queryBuilder.andWhere('(apiKey.expiresAt IS NULL OR apiKey.expiresAt > :now)', { now: new Date() });
    }

    // 日期范围过滤
    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere('apiKey.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder = queryBuilder.andWhere('apiKey.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder = queryBuilder.andWhere('apiKey.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // 排序
    const sortField = sortBy === 'usageCount' ? 'apiKey.usageCount' :
                     sortBy === 'name' ? 'apiKey.name' :
                     sortBy === 'lastUsedAt' ? 'apiKey.lastUsedAt' :
                     sortBy === 'updatedAt' ? 'apiKey.updatedAt' :
                     'apiKey.createdAt';

    queryBuilder = queryBuilder.orderBy(sortField, sortOrder || 'DESC');

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取分页数据
    const apiKeys = await queryBuilder
      .skip(offset)
      .take(limit)
      .getMany();

    // 转换为响应格式（隐藏完整的key）
    const items = apiKeys.map(apiKey => this.transformToResponseDto(apiKey));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * 根据ID获取用户的单个API Key
   */
  async getUserApiKeyById(userId: string, keyId: number): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    return this.transformToResponseDto(apiKey);
  }

  /**
   * 启用API Key
   */
  async enableApiKey(userId: string, keyId: number): Promise<void> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    await this.apiKeyRepo.update(keyId, { isActive: true });
  }

  /**
   * 获取API Key使用统计
   */
  async getApiKeyStats(userId: string, keyId: number): Promise<ApiKeyStatsDto> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    const daysSinceCreation = Math.ceil((new Date().getTime() - apiKey.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyUsage = daysSinceCreation > 0 ? apiKey.usageCount / daysSinceCreation : 0;

    return {
      id: apiKey.id,
      name: apiKey.name,
      usageCount: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      daysSinceCreation,
      averageDailyUsage: Math.round(averageDailyUsage * 100) / 100,
    };
  }

  /**
   * 重新生成API Key
   */
  async regenerateApiKey(userId: string, keyId: number, createdIp?: string): Promise<string> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    // 生成新的API Key
    const newKey = ApiKeyEntity.generateKey();

    // 更新数据库
    await this.apiKeyRepo.update(keyId, {
      key: newKey,
      updatedIp: createdIp,
      updatedAt: new Date(),
    });

    return newKey;
  }

  /**
   * 批量操作：禁用用户的所有API Key
   */
  async disableAllUserApiKeys(userId: string): Promise<void> {
    await this.apiKeyRepo.update(
      { userId },
      { isActive: false }
    );
  }

  /**
   * 清理过期的API Key
   */
  async cleanupExpiredApiKeys(): Promise<number> {
    const result = await this.apiKeyRepo
      .createQueryBuilder()
      .update(ApiKeyEntity)
      .set({ isActive: false })
      .where('expiresAt IS NOT NULL AND expiresAt <= :now', { now: new Date() })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    return result.affected || 0;
  }

  /**
   * 获取用户的API Key使用统计汇总
   */
  async getUserApiKeySummary(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    totalUsage: number;
  }> {
    const [total, active, inactive, expired] = await Promise.all([
      this.apiKeyRepo.count({ where: { userId } }),
      this.apiKeyRepo.count({
        where: {
          userId,
          isActive: true,
          ...(await this.getNonExpiredCondition())
        }
      }),
      this.apiKeyRepo.count({ where: { userId, isActive: false } }),
      this.apiKeyRepo.count({
        where: {
          userId,
          ...(await this.getExpiredCondition())
        }
      }),
    ]);

    const totalUsageResult = await this.apiKeyRepo
      .createQueryBuilder('apiKey')
      .select('SUM(apiKey.usageCount)', 'total')
      .where('apiKey.userId = :userId', { userId })
      .getRawOne();

    const totalUsage = parseInt(totalUsageResult?.total || '0');

    return { total, active, inactive, expired, totalUsage };
  }

  /**
   * 将ApiKeyEntity转换为响应DTO
   */
  private transformToResponseDto(apiKey: ApiKeyEntity): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      key: `${apiKey.key.substring(0, 7)}...${apiKey.key.substring(apiKey.key.length - 4)}`,
      name: apiKey.name,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      usageCount: apiKey.usageCount,
      expiresAt: apiKey.expiresAt,
      createdIp: apiKey.createdIp,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      isExpired: apiKey.isExpired,
      isValid: apiKey.isValid,
    };
  }

  /**
   * 获取非过期条件
   */
  private async getNonExpiredCondition(): Promise<{ expiresAt?: any }> {
    return {
      expiresAt: null, // 这里实际上需要更复杂的逻辑，暂时简化
    };
  }

  /**
   * 获取过期条件
   */
  private async getExpiredCondition(): Promise<{ expiresAt?: any }> {
    return {
      expiresAt: { $lte: new Date() }, // 这里需要根据具体的数据库适配
    };
  }

  /**
   * 为测试用户创建默认API Key
   */
  async createTestApiKey(): Promise<string> {
    // 查找或创建测试用户
    let testUser = await this.userRepo.findOne({ where: { username: 'test-user' } });

    if (!testUser) {
      testUser = this.userRepo.create({
        username: 'test-user',
        email: 'test@example.com',
        password: 'test-password-hash', // 实际应该加密
        status: 'active',
      });
      testUser = await this.userRepo.save(testUser);
    }

    // 检查是否已有测试API Key
    let testApiKey = await this.apiKeyRepo.findOne({
      where: { userId: testUser.id, name: 'Test API Key' },
    });

    if (!testApiKey) {
      const key = ApiKeyEntity.generateKey();
      testApiKey = this.apiKeyRepo.create({
        key,
        userId: testUser.id,
        name: 'Test API Key',
        isActive: true,
      });
      testApiKey = await this.apiKeyRepo.save(testApiKey);
    }

    return testApiKey.key;
  }
}