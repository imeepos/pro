import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Between, Like, SelectQueryBuilder } from 'typeorm';
import { ApiKeyEntity, UserEntity, useEntityManager, useTranslation } from '@pro/entities';
import { ApiKeyType, ApiKeySortBy, UserStatus } from '@pro/types';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyQueryDto,
  ApiKeyListResponseDto,
  ApiKeyResponseDto,
  ApiKeyStatsDto,
  ApiKeySummaryStatsDto
} from './dto/api-key.dto';
import { ApiKeyStatusFilter } from '@pro/types';

/**
 * API Key 管理服务
 * 提供API Key的创建、验证、禁用等功能
 */
@Injectable()
export class ApiKeyService {

  /**
   * 根据API Key类型获取对应的权限数组
   */
  private getPermissionsByType(type: ApiKeyType): string[] {
    switch (type) {
      case ApiKeyType.READ_ONLY:
        return ['read:events', 'read:users', 'read:config'];
      case ApiKeyType.READ_WRITE:
        return ['read:events', 'write:events', 'read:users', 'read:config'];
      case ApiKeyType.ADMIN:
        return ['read:events', 'write:events', 'delete:events', 'read:users', 'write:users', 'read:config', 'write:config', 'admin:all'];
      default:
        return ['read:events', 'read:users', 'read:config'];
    }
  }

  /**
   * 为用户创建新的API Key
   */
  async createApiKey(userId: string, createDto: CreateApiKeyDto, createdIp?: string): Promise<ApiKeyResponseDto> {
    return await useEntityManager(async (manager) => {
      // 验证用户存在
      const user = await manager.findOne(UserEntity, { where: { id: userId, status: UserStatus.ACTIVE } });
      if (!user) {
        throw new NotFoundException('用户不存在或已被禁用');
      }

      // 检查用户是否已有太多API Key（限制10个）
      const existingCount = await manager.count(ApiKeyEntity, { where: { userId, isActive: true } });
      if (existingCount >= 10) {
        throw new UnauthorizedException('每个用户最多只能创建10个有效的API Key');
      }

      // 生成新的API Key
      const key = ApiKeyEntity.generateKey();

      // 确定权限：如果用户未设置权限或权限为空，则根据类型自动设置
      const permissions = (!createDto.permissions || createDto.permissions.length === 0)
        ? this.getPermissionsByType(createDto.type)
        : createDto.permissions;

      const apiKey = manager.create(ApiKeyEntity, {
        key,
        userId,
        name: createDto.name,
        description: createDto.description || null,
        type: createDto.type,
        permissions,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
        createdIp,
      });

      const savedApiKey = await manager.save(apiKey);

      return this.toResponse(savedApiKey);
    });
  }

  /**
   * 验证API Key并返回用户信息
   */
  async validateApiKey(key: string): Promise<{ user: UserEntity; apiKey: ApiKeyEntity }> {
    return await useEntityManager(async (manager) => {
      const apiKeyEntity = await manager.findOne(ApiKeyEntity, {
        where: { key, isActive: true },
        relations: ['user'],
      });

      if (!apiKeyEntity) {
        throw new UnauthorizedException('API Key 无效或已禁用');
      }

      if (apiKeyEntity.isExpired) {
        throw new UnauthorizedException('API Key 已过期');
      }

      if (apiKeyEntity.user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('用户账户已被禁用');
      }

      // 更新使用统计
      await manager.update(ApiKeyEntity, apiKeyEntity.id, {
        lastUsedAt: new Date(),
        usageCount: apiKeyEntity.usageCount + 1,
      });

      return {
        user: apiKeyEntity.user,
        apiKey: apiKeyEntity,
      };
    });
  }

  /**
   * 获取用户的所有API Key
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyResponseDto[]> {
    return await useEntityManager(async (manager) => {
      const apiKeys = await manager.find(ApiKeyEntity, {
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      // 隐藏完整的key
      return apiKeys.map((key) => this.toResponse(key));
    });
  }

  /**
   * 禁用API Key
   */
  async disableApiKey(userId: string, keyId: number): Promise<void> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      await manager.update(ApiKeyEntity, keyId, { isActive: false });
    });
  }

  /**
   * 更新API Key
   */
  async updateApiKey(userId: string, keyId: number, updateDto: UpdateApiKeyDto): Promise<ApiKeyResponseDto> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      // 准备更新数据
      const updateData: Partial<ApiKeyEntity> = {
        ...updateDto,
        // 处理日期类型转换
        expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined,
      };

      // 权限自动设置逻辑：如果更新了类型且权限为空或未定义，则根据新类型自动设置权限
      if (updateDto.type && (!updateDto.permissions || updateDto.permissions.length === 0)) {
        updateData.permissions = this.getPermissionsByType(updateDto.type);
      } else if (updateDto.type && updateDto.permissions && updateDto.permissions.length > 0) {
        // 如果用户同时提供了类型和权限，保留用户设置的权限
        updateData.permissions = updateDto.permissions;
      }

      await manager.update(ApiKeyEntity, keyId, updateData);

      const updatedApiKey = await manager.findOne(ApiKeyEntity, { where: { id: keyId } });

      if (!updatedApiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      return this.toResponse(updatedApiKey);
    });
  }

  /**
   * 删除API Key
   */
  async deleteApiKey(userId: string, keyId: number): Promise<void> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      await manager.delete(ApiKeyEntity, keyId);
    });
  }

  /**
   * 分页获取用户的API Key列表（支持搜索和过滤）
   */
  async getUserApiKeysPaginated(
    userId: string,
    query: ApiKeyQueryDto,
  ): Promise<ApiKeyListResponseDto> {
    return await useEntityManager(async (manager) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { page = 1, limit = 10, search, status, includeExpired = false, sortBy, sortOrder, startDate, endDate } = query;
      const offset = (page - 1) * limit;

      // 构建查询
      let queryBuilder: SelectQueryBuilder<ApiKeyEntity> = manager
        .createQueryBuilder(ApiKeyEntity, 'apiKey')
        .where('apiKey.userId = :userId', { userId });

      // 搜索条件
      if (search) {
        queryBuilder = queryBuilder.andWhere('apiKey.name LIKE :search', { search: `%${search}%` });
      }

      // 状态过滤
      if (status && status !== ApiKeyStatusFilter.ALL) {
        switch (status) {
          case ApiKeyStatusFilter.ACTIVE:
            queryBuilder = queryBuilder.andWhere('apiKey.isActive = :isActive', { isActive: true });
            if (!includeExpired) {
              queryBuilder = queryBuilder.andWhere('(apiKey.expiresAt IS NULL OR apiKey.expiresAt > :now)', { now: new Date() });
            }
            break;
          case ApiKeyStatusFilter.INACTIVE:
            queryBuilder = queryBuilder.andWhere('apiKey.isActive = :isActive', { isActive: false });
            break;
          case ApiKeyStatusFilter.EXPIRED:
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
      const sortField = sortBy === ApiKeySortBy.USAGE_COUNT ? 'apiKey.usageCount' :
                       sortBy === ApiKeySortBy.NAME ? 'apiKey.name' :
                       sortBy === ApiKeySortBy.LAST_USED_AT ? 'apiKey.lastUsedAt' :
                       sortBy === ApiKeySortBy.UPDATED_AT ? 'apiKey.updatedAt' :
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
      const items = apiKeys.map(apiKey => this.toResponse(apiKey));

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
    });
  }

  /**
   * 根据ID获取用户的单个API Key
   */
  async getUserApiKeyById(userId: string, keyId: number): Promise<ApiKeyResponseDto> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      return this.toResponse(apiKey);
    });
  }

  /**
   * 启用API Key
   */
  async enableApiKey(userId: string, keyId: number): Promise<void> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      await manager.update(ApiKeyEntity, keyId, { isActive: true });
    });
  }

  /**
   * 获取API Key使用统计
   */
  async getApiKeyStats(userId: string, keyId: number): Promise<ApiKeyStatsDto> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
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
    });
  }

  /**
   * 重新生成API Key
   */
  async regenerateApiKey(userId: string, keyId: number, createdIp?: string): Promise<string> {
    return await useEntityManager(async (manager) => {
      const apiKey = await manager.findOne(ApiKeyEntity, {
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        throw new NotFoundException('API Key 不存在');
      }

      // 生成新的API Key
      const newKey = ApiKeyEntity.generateKey();

      // 更新数据库
      await manager.update(ApiKeyEntity, keyId, {
        key: newKey,
        updatedIp: createdIp,
        updatedAt: new Date(),
      });

      return newKey;
    });
  }

  /**
   * 批量操作：禁用用户的所有API Key
   */
  async disableAllUserApiKeys(userId: string): Promise<void> {
    return await useEntityManager(async (manager) => {
      await manager.update(ApiKeyEntity, { userId }, { isActive: false });
    });
  }

  /**
   * 清理过期的API Key
   */
  async cleanupExpiredApiKeys(): Promise<number> {
    return await useEntityManager(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(ApiKeyEntity)
        .set({ isActive: false })
        .where('expiresAt IS NOT NULL AND expiresAt <= :now', { now: new Date() })
        .andWhere('isActive = :isActive', { isActive: true })
        .execute();

      return result.affected || 0;
    });
  }

  /**
   * 获取用户的API Key汇总统计
   */
  async getUserApiKeysSummaryStats(userId: string): Promise<ApiKeySummaryStatsDto> {
    return useEntityManager(async (m) => {
      const apiKeyRepo = m.getRepository(ApiKeyEntity);
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // 使用单个查询获取所有统计数据，符合性能优化原则
      const queryBuilder = apiKeyRepo
        .createQueryBuilder('apiKey')
        .select([
          'COUNT(*) as total',
          'SUM(CASE WHEN apiKey.isActive = true AND (apiKey.expiresAt IS NULL OR apiKey.expiresAt > :now) THEN 1 ELSE 0 END) as active',
          'SUM(CASE WHEN apiKey.isActive = false THEN 1 ELSE 0 END) as inactive',
          'SUM(CASE WHEN apiKey.expiresAt IS NOT NULL AND apiKey.expiresAt <= :now THEN 1 ELSE 0 END) as expired',
          'SUM(CASE WHEN apiKey.usageCount = 0 THEN 1 ELSE 0 END) as neverUsed',
          'SUM(CASE WHEN apiKey.expiresAt IS NOT NULL AND apiKey.expiresAt > :now AND apiKey.expiresAt <= :sevenDaysLater THEN 1 ELSE 0 END) as expiringSoon',
          'SUM(apiKey.usageCount) as totalUsage'
        ])
        .where('apiKey.userId = :userId', { userId })
        .setParameters({ now, sevenDaysLater });

      const stats = await queryBuilder.getRawOne();

      // 单独计算平均每日使用次数，避免数据库特定函数
      const allKeys = await apiKeyRepo.find({
        where: { userId },
        select: ['usageCount', 'createdAt']
      });

      const averageDailyUsage = allKeys.length > 0
        ? allKeys.reduce((sum, key) => {
            const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - key.createdAt.getTime()) / (24 * 60 * 60 * 1000)));
            return sum + (key.usageCount / daysSinceCreation);
          }, 0) / allKeys.length
        : 0;

      // 获取使用次数最多的API Key
      const mostUsedApiKey = await apiKeyRepo.findOne({
        where: { userId },
        order: { usageCount: 'DESC' },
      });

      // 获取最近使用的API Key
      const recentlyUsedApiKey = await apiKeyRepo.findOne({
        where: { userId },
        order: { lastUsedAt: 'DESC' },
      });

      return {
        total: parseInt(stats.total || '0') || 0,
        active: parseInt(stats.active || '0') || 0,
        inactive: parseInt(stats.inactive || '0') || 0,
        expired: parseInt(stats.expired || '0') || 0,
        neverUsed: parseInt(stats.neverUsed || '0') || 0,
        expiringSoon: parseInt(stats.expiringSoon || '0') || 0,
        totalUsage: parseInt(stats.totalUsage || '0') || 0,
        averageDailyUsage: isNaN(averageDailyUsage) ? 0 : Math.round(averageDailyUsage * 100) / 100,
        mostUsed: mostUsedApiKey ? await this.getApiKeyStats(userId, mostUsedApiKey.id) : undefined,
        recentlyUsed: recentlyUsedApiKey ? await this.getApiKeyStats(userId, recentlyUsedApiKey.id) : undefined,
      };
    });
  }

  /**
   * 将ApiKeyEntity转换为响应DTO
   */
  public toResponse(apiKey: ApiKeyEntity): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      key: `${apiKey.key.substring(0, 7)}...${apiKey.key.substring(apiKey.key.length - 4)}`,
      name: apiKey.name,
      description: apiKey.description,
      type: apiKey.type,
      permissions: apiKey.permissions,
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
}