import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserStatus } from '@pro/types';
import { BugEntity } from './bug.entity.js';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relations with Bug system
  @OneToMany(() => BugEntity, (bug) => bug.reporter)
  reportedBugs: BugEntity[];

  @OneToMany(() => BugEntity, (bug) => bug.assignee)
  assignedBugs: BugEntity[];
}
