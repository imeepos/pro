import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Like } from 'typeorm';
import {
  TagEntity,
  useEntityManager,
} from '@pro/entities';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagService {

  async create(createDto: CreateTagDto): Promise<TagEntity> {
    return useEntityManager(async (manager) => {
      const existing = await manager.getRepository(TagEntity).findOne({
        where: { tagName: createDto.tagName },
      });

      if (existing) {
        throw new ConflictException(`标签名称 ${createDto.tagName} 已存在`);
      }

      const tag = manager.getRepository(TagEntity).create(createDto);
      return manager.getRepository(TagEntity).save(tag);
    });
  }

  async findAll(page = 1, pageSize = 20, keyword?: string) {
    return useEntityManager(async (manager) => {
      const query = manager.getRepository(TagEntity).createQueryBuilder('tag');

      if (keyword) {
        query.where('tag.tagName LIKE :keyword', { keyword: `%${keyword}%` });
      }

      const [items, total] = await query
        .orderBy('tag.usageCount', 'DESC')
        .addOrderBy('tag.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async findOne(id: string): Promise<TagEntity> {
    return useEntityManager(async (manager) => {
      const tag = await manager.getRepository(TagEntity).findOne({
        where: { id },
      });

      if (!tag) {
        throw new NotFoundException(`标签 ID ${id} 不存在`);
      }

      return tag;
    });
  }

  async findPopular(limit = 20): Promise<TagEntity[]> {
    return useEntityManager(async (manager) => {
      return manager.getRepository(TagEntity).find({
        order: { usageCount: 'DESC', createdAt: 'DESC' },
        take: limit,
      });
    });
  }

  async update(id: string, updateDto: UpdateTagDto): Promise<TagEntity> {
    return useEntityManager(async (manager) => {
      const tag = await this.findOne(id);

      if (updateDto.tagName && updateDto.tagName !== tag.tagName) {
        const existing = await manager.getRepository(TagEntity).findOne({
          where: { tagName: updateDto.tagName },
        });

        if (existing) {
          throw new ConflictException(`标签名称 ${updateDto.tagName} 已存在`);
        }
      }

      Object.assign(tag, updateDto);
      return manager.getRepository(TagEntity).save(tag);
    });
  }

  async remove(id: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const tag = await this.findOne(id);
      await manager.getRepository(TagEntity).remove(tag);
    });
  }
}
