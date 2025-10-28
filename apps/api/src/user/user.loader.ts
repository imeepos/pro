import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { User } from '@pro/types';
import { UserEntity, useEntityManager } from '@pro/entities';
import { UserService } from './user.service';

@Injectable()
export class UserLoader {
  constructor(private readonly userService: UserService) {}

  create(): DataLoader<string, User | null> {
    return new DataLoader<string, User | null>(async (ids) => {
      const records = await useEntityManager(async (m) =>
        m.getRepository(UserEntity).find({
          where: { id: In([...ids]) },
        })
      );

      const sanitized = records.map((record) => this.userService.sanitizeUser(record));
      const lookup = new Map(sanitized.map((user) => [user.id, user]));

      return ids.map((id) => lookup.get(id) ?? null);
    });
  }
}
