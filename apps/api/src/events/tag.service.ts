import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TagEntity } from '@pro/entities';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
  ) {}

  async create(createDto: CreateTagDto): Promise<TagEntity> {
    const existing = await this.tagRepository.findOne({
      where: { tagName: createDto.tagName },
    });

    if (existing) {
      throw new ConflictException(`标签名称 ${createDto.tagName} 已存在`);
    }

    const tag = this.tagRepository.create(createDto);
    return this.tagRepository.save(tag);
  }

  async findAll(page = 1, pageSize = 20, keyword?: string) {
    const query = this.tagRepository.createQueryBuilder('tag');

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
  }

  async findOne(id: string): Promise<TagEntity> {
    const tag = await this.tagRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    return tag;
  }

  async findPopular(limit = 20): Promise<TagEntity[]> {
    return this.tagRepository.find({
      order: { usageCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async update(id: string, updateDto: UpdateTagDto): Promise<TagEntity> {
    const tag = await this.findOne(id);

    if (updateDto.tagName && updateDto.tagName !== tag.tagName) {
      const existing = await this.tagRepository.findOne({
        where: { tagName: updateDto.tagName },
      });

      if (existing) {
        throw new ConflictException(`标签名称 ${updateDto.tagName} 已存在`);
      }
    }

    Object.assign(tag, updateDto);
    return this.tagRepository.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }
}
