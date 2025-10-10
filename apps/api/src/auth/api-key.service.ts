import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { UserEntity } from '../entities/user.entity';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';

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