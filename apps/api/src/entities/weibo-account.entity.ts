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
import { UserEntity } from './user.entity';

/**
 * 微博账号状态枚举
 */
export enum WeiboAccountStatus {
  ACTIVE = 'active',     // 正常可用
  EXPIRED = 'expired',   // Cookie 已过期
  BANNED = 'banned',     // 账号被封禁
}

/**
 * 微博账号实体
 * 用于存储用户绑定的微博账号信息和登录凭证
 */
@Entity('weibo_accounts')
@Index(['userId', 'weiboUid'], { unique: true }) // 同一用户不能重复绑定同一微博账号
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, name: 'weibo_uid' })
  weiboUid: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'weibo_nickname' })
  weiboNickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'weibo_avatar' })
  weiboAvatar: string;

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

  // 关联到用户表
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
