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
import { IndustryTypeEntity } from './industry-type.entity';
import { EventEntity } from './event.entity';

@Entity('event_type')
export class EventTypeEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true, name: 'event_code' })
  eventCode: string;

  @Column({ type: 'varchar', length: 100, name: 'event_name' })
  eventName: string;

  @Index()
  @Column({ type: 'bigint', name: 'industry_id' })
  industryId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Index()
  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => IndustryTypeEntity, (industry) => industry.eventTypes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'industry_id' })
  industryType: IndustryTypeEntity;

  @OneToMany(() => EventEntity, (event) => event.eventType)
  events: EventEntity[];
}
