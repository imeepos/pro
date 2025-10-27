import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventEntity } from './event.entity.js';
import { TagEntity } from './tag.entity.js';
import { Entity } from './decorator.js';

@Entity('event_tag')
@Index(['eventId', 'tagId'], { unique: true })
export class EventTagEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index()
  @Column({ type: 'bigint', name: 'event_id' })
  eventId: string;

  @Index()
  @Column({ type: 'bigint', name: 'tag_id' })
  tagId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EventEntity, (event) => event.eventTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.eventTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag: TagEntity;
}
