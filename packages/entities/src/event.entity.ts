import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { EventTypeEntity } from './event-type.entity.js';
import { IndustryTypeEntity } from './industry-type.entity.js';
import { EventAttachmentEntity } from './event-attachment.entity.js';
import { EventTagEntity } from './event-tag.entity.js';

export enum EventStatus {
  DRAFT = 0,
  PUBLISHED = 1,
  ARCHIVED = 2,
}

@Entity('event')
export class EventEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index()
  @Column({ type: 'bigint', name: 'event_type_id' })
  eventTypeId: string;

  @Index()
  @Column({ type: 'bigint', name: 'industry_type_id' })
  industryTypeId: string;

  @Column({ type: 'varchar', length: 200, name: 'event_name' })
  eventName: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Index()
  @Column({ type: 'timestamp', name: 'occur_time' })
  occurTime: Date;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  province: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  street: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'location_text' })
  locationText: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Index()
  @Column({
    type: 'smallint',
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ type: 'varchar', nullable: true, name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => EventTypeEntity, (eventType) => eventType.events, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'event_type_id' })
  eventType: EventTypeEntity;

  @ManyToOne(() => IndustryTypeEntity, (industry) => industry.events, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'industry_type_id' })
  industryType: IndustryTypeEntity;

  @OneToMany(() => EventAttachmentEntity, (attachment) => attachment.event, {
    cascade: true,
  })
  attachments: EventAttachmentEntity[];

  @OneToMany(() => EventTagEntity, (eventTag) => eventTag.event, {
    cascade: true,
  })
  eventTags: EventTagEntity[];
}
