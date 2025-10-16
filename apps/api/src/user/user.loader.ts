import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '@pro/types';
import { UserEntity } from '@pro/entities';
import { UserService } from './user.service';

@Injectable()
export class UserLoader {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly userService: UserService,
  ) {}

  create(): DataLoader<string, User | null> {
    return new DataLoader<string, User | null>(async (ids) => {
      const records = await this.userRepository.find({
        where: { id: In([...ids]) },
      });

      const sanitized = records.map((record) => this.userService.sanitizeUser(record));
      const lookup = new Map(sanitized.map((user) => [user.id, user]));

      return ids.map((id) => lookup.get(id) ?? null);
    });
  }
}
