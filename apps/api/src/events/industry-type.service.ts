import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { IndustryTypeEntity, useEntityManager, useTranslation } from '@pro/entities';
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from './dto/industry-type.dto';

@Injectable()
export class IndustryTypeService {
  async create(createDto: CreateIndustryTypeDto): Promise<IndustryTypeEntity> {
    return useTranslation(async (m) => {
      const repo = m.getRepository(IndustryTypeEntity);

      const existing = await repo.findOne({
        where: { industryCode: createDto.industryCode },
      });

      if (existing) {
        throw new ConflictException(`行业类型编码 ${createDto.industryCode} 已存在`);
      }

      const industryType = repo.create(createDto);
      return repo.save(industryType);
    });
  }

  async findAll(): Promise<IndustryTypeEntity[]> {
    return useEntityManager(async (m) => {
      return m.getRepository(IndustryTypeEntity).find({
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
    });
  }

  async findOne(id: string): Promise<IndustryTypeEntity> {
    return useEntityManager(async (m) => {
      const industryType = await m.getRepository(IndustryTypeEntity).findOne({
        where: { id },
      });

      if (!industryType) {
        throw new NotFoundException(`行业类型 ID ${id} 不存在`);
      }

      return industryType;
    });
  }

  async update(
    id: string,
    updateDto: UpdateIndustryTypeDto,
  ): Promise<IndustryTypeEntity> {
    return useTranslation(async (m) => {
      const repo = m.getRepository(IndustryTypeEntity);

      const industryType = await repo.findOne({ where: { id } });

      if (!industryType) {
        throw new NotFoundException(`行业类型 ID ${id} 不存在`);
      }

      if (updateDto.industryCode && updateDto.industryCode !== industryType.industryCode) {
        const existing = await repo.findOne({
          where: { industryCode: updateDto.industryCode },
        });

        if (existing) {
          throw new ConflictException(`行业类型编码 ${updateDto.industryCode} 已存在`);
        }
      }

      Object.assign(industryType, updateDto);
      return repo.save(industryType);
    });
  }

  async remove(id: string): Promise<void> {
    return useTranslation(async (m) => {
      const repo = m.getRepository(IndustryTypeEntity);

      const industryType = await repo.findOne({ where: { id } });

      if (!industryType) {
        throw new NotFoundException(`行业类型 ID ${id} 不存在`);
      }

      const eventCount = await repo
        .createQueryBuilder('industryType')
        .leftJoin('industryType.events', 'event')
        .where('industryType.id = :id', { id })
        .getCount();

      if (eventCount > 0) {
        throw new ConflictException('该行业类型下存在关联事件,无法删除');
      }

      await repo.remove(industryType);
    });
  }
}
