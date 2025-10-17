import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '@pro/entities';
import { UserEntity } from '@pro/entities';
import { JwtPayload, UserStatus } from '@pro/types';

/**
 * API Key 认证策略
 * 从请求头或查询参数中提取 API Key 并验证
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    super(
      { header: 'X-API-Key', prefix: '' },
      false
    );
  }

  async validate(apiKey: string, done: Function): Promise<void> {
    try {
      const result = await this.validateMethod(apiKey);
      done(null, result);
    } catch (err) {
      done(err, false);
    }
  }

  async validateMethod(apiKey: string): Promise<JwtPayload> {
    if (!apiKey) {
      throw new UnauthorizedException('API Key 未提供');
    }

    // 验证API Key格式
    if (!apiKey.startsWith('ak_') || apiKey.length !== 35) {
      throw new UnauthorizedException('API Key 格式无效');
    }

    // 查找API Key
    const apiKeyEntity = await this.apiKeyRepo.findOne({
      where: { key: apiKey, isActive: true },
      relations: ['user'],
    });

    if (!apiKeyEntity) {
      throw new UnauthorizedException('API Key 无效或已禁用');
    }

    // 检查是否过期
    if (apiKeyEntity.isExpired) {
      throw new UnauthorizedException('API Key 已过期');
    }

    // 检查用户状态
    if (apiKeyEntity.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('用户账户已被禁用');
    }

    // 更新使用统计
    await this.apiKeyRepo.update(apiKeyEntity.id, {
      lastUsedAt: new Date(),
      usageCount: apiKeyEntity.usageCount + 1,
    });

    // 返回JWT兼容的payload
    const payload: JwtPayload = {
      userId: apiKeyEntity.userId,
      username: apiKeyEntity.user.username,
      email: apiKeyEntity.user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1小时过期
    };

    return payload;
  }
}