import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { EventTagEntity } from './event-tag.entity.js';

@Entity('tag')
export class TagEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true, name: 'tag_name' })
  tagName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '#1890ff',
    name: 'tag_color',
  })
  tagColor: string;

  @Index()
  @Column({ type: 'integer', default: 0, name: 'usage_count' })
  usageCount: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => EventTagEntity, (eventTag) => eventTag.tag)
  eventTags: EventTagEntity[];
}
