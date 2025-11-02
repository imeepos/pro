import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserEntity, useEntityManager, useTranslation } from '@pro/entities';
import { UpdateUserDto } from './dto';
import { User } from '@pro/types';

@Injectable()
export class UserService {
  async findAll(): Promise<User[]> {
    return useEntityManager(async (m) =>
      (await m.getRepository(UserEntity).find()).map((user) => this.sanitizeUser(user))
    );
  }

  async findOne(id: string): Promise<User> {
    const user = await useEntityManager(async (m) =>
      m.getRepository(UserEntity).findOne({ where: { id } })
    );

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return useTranslation(async (m) => {
      const repository = m.getRepository(UserEntity);
      const user = await repository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existingUser = await repository.findOne({
          where: { username: updateUserDto.username },
        });

        if (existingUser) {
          throw new ConflictException('用户名已存在');
        }
      }

      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await repository.findOne({
          where: { email: updateUserDto.email },
        });

        if (existingUser) {
          throw new ConflictException('邮箱已被注册');
        }
      }

      Object.assign(user, updateUserDto);
      const updatedUser = await repository.save(user);

      return this.sanitizeUser(updatedUser);
    });
  }

  async remove(id: string): Promise<void> {
    await useEntityManager(async (m) => {
      const repository = m.getRepository(UserEntity);
      const user = await repository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      await repository.remove(user);
    });
  }

  public sanitizeUser(user: UserEntity): User {
    const { password, ...sanitized } = user;
    return sanitized as User;
  }
}
