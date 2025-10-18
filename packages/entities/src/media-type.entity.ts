import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MediaTypeStatus } from '@pro/types';

@Entity('media_type')
export class MediaTypeEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, name: 'type_code' })
  typeCode: string;

  @Column({ type: 'varchar', length: 100, name: 'type_name' })
  typeName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Index()
  @Column({
    type: 'enum',
    enum: MediaTypeStatus,
    default: MediaTypeStatus.ACTIVE,
  })
  status: MediaTypeStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
