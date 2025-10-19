import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('weibo_users')
@Index(['weiboUid'], { unique: true })
export class WeiboUserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'weibo_uid' })
  weiboUid: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'int', nullable: true, name: 'followers_count' })
  followersCount: number | null;

  @Column({ type: 'int', nullable: true, name: 'following_count' })
  followingCount: number | null;

  @Column({ type: 'int', nullable: true, name: 'posts_count' })
  postsCount: number | null;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'verified_reason' })
  verifiedReason: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
