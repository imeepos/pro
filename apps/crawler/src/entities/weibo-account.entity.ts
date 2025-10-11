import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 微博账号状态枚举
 */
export enum WeiboAccountStatus {
  ACTIVE = 'active',       // 正常可用
  EXPIRED = 'expired',     // Cookie 已过期
  BANNED = 'banned',       // 账号被封禁
  RESTRICTED = 'restricted', // 风控受限
}

/**
 * 微博账号实体 (简化版)
 * 用于爬虫服务读取微博账号信息
 */
@Entity('weibo_accounts')
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'weibo_uid' })
  weiboUid: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'weibo_nickname' })
  weiboNickname: string;

  @Column({ type: 'text' })
  cookies: string;

  @Index()
  @Column({
    type: 'enum',
    enum: WeiboAccountStatus,
    default: WeiboAccountStatus.ACTIVE,
  })
  status: WeiboAccountStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_check_at' })
  lastCheckAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}