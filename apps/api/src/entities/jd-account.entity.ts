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
 * 京东账号状态枚举
 */
export enum JdAccountStatus {
  ACTIVE = 'active',       // 正常可用
  EXPIRED = 'expired',     // Cookie 已过期
  BANNED = 'banned',       // 账号被封禁
  RESTRICTED = 'restricted', // 风控受限
}

/**
 * 京东账号实体
 * 用于存储用户绑定的京东账号信息和登录凭证
 */
@Entity('jd_accounts')
@Index(['userId', 'jdUid'], { unique: true }) // 同一用户不能重复绑定同一京东账号
export class JdAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, name: 'jd_uid' })
  jdUid: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'jd_nickname' })
  jdNickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'jd_avatar' })
  jdAvatar: string;

  @Column({ type: 'text' })
  cookies: string;

  @Index()
  @Column({
    type: 'enum',
    enum: JdAccountStatus,
    default: JdAccountStatus.ACTIVE,
  })
  status: JdAccountStatus;

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