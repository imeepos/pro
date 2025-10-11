import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity.js';

/**
 * API Key 实体
 * 用于API访问认证，绑定特定用户
 */
@Entity('api_keys')
@Index(['key', 'isActive']) // 用于快速查询有效的API Key
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * API Key 字符串
   * 格式: ak_<32位随机字符>
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 35, unique: true })
  key: string;

  /**
   * 关联的用户ID
   */
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /**
   * API Key 名称/描述
   * 便于管理和识别
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * 是否启用
   */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  /**
   * 最后使用时间
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt?: Date;

  /**
   * 使用次数统计
   */
  @Column({ type: 'int', default: 0, name: 'usage_count' })
  usageCount: number;

  /**
   * 过期时间
   * null表示永不过期
   */
  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  /**
   * 创建IP地址
   */
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'created_ip' })
  createdIp?: string;

  /**
   * 最后更新IP地址
   */
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'updated_ip' })
  updatedIp?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * 检查API Key是否过期
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * 检查API Key是否可用
   */
  get isValid(): boolean {
    return this.isActive && !this.isExpired;
  }

  /**
   * 更新使用统计
   */
  updateUsage(): void {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
  }

  /**
   * 生成API Key字符串
   */
  static generateKey(): string {
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `ak_${randomPart}`;
  }
}