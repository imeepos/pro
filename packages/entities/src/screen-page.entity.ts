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

export type ScreenStatus = 'draft' | 'published';

export interface LayoutConfig {
  width: number;
  height: number;
  background: string;
  grid?: {
    enabled: boolean;
    size: number;
  };
}

export interface ComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ComponentDataSource {
  type: 'api' | 'static';
  url?: string;
  data?: any;
  refreshInterval?: number;
}

export interface ScreenComponent {
  id: string;
  type: string;
  position: ComponentPosition;
  config: any;
  dataSource?: ComponentDataSource;
}

@Entity('screen_pages')
export class ScreenPageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  layout: LayoutConfig;

  @Column({ type: 'jsonb', default: [] })
  components: ScreenComponent[];

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: ScreenStatus;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Index()
  @Column({ type: 'varchar', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;
}
