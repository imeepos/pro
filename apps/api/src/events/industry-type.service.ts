import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndustryTypeEntity } from '@pro/entities';
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from './dto/industry-type.dto';

@Injectable()
export class IndustryTypeService {
  constructor(
    @InjectRepository(IndustryTypeEntity)
    private readonly industryTypeRepository: Repository<IndustryTypeEntity>,
  ) {}

  async create(createDto: CreateIndustryTypeDto): Promise<IndustryTypeEntity> {
    const existing = await this.industryTypeRepository.findOne({
      where: { industryCode: createDto.industryCode },
    });

    if (existing) {
      throw new ConflictException(`行业类型编码 ${createDto.industryCode} 已存在`);
    }

    const industryType = this.industryTypeRepository.create(createDto);
    return this.industryTypeRepository.save(industryType);
  }

  async findAll(): Promise<IndustryTypeEntity[]> {
    return this.industryTypeRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<IndustryTypeEntity> {
    const industryType = await this.industryTypeRepository.findOne({
      where: { id },
    });

    if (!industryType) {
      throw new NotFoundException(`行业类型 ID ${id} 不存在`);
    }

    return industryType;
  }

  async update(
    id: string,
    updateDto: UpdateIndustryTypeDto,
  ): Promise<IndustryTypeEntity> {
    const industryType = await this.findOne(id);

    if (updateDto.industryCode && updateDto.industryCode !== industryType.industryCode) {
      const existing = await this.industryTypeRepository.findOne({
        where: { industryCode: updateDto.industryCode },
      });

      if (existing) {
        throw new ConflictException(`行业类型编码 ${updateDto.industryCode} 已存在`);
      }
    }

    Object.assign(industryType, updateDto);
    return this.industryTypeRepository.save(industryType);
  }

  async remove(id: string): Promise<void> {
    const industryType = await this.findOne(id);

    const eventCount = await this.industryTypeRepository
      .createQueryBuilder('industryType')
      .leftJoin('industryType.events', 'event')
      .where('industryType.id = :id', { id })
      .getCount();

    if (eventCount > 0) {
      throw new ConflictException('该行业类型下存在关联事件,无法删除');
    }

    await this.industryTypeRepository.remove(industryType);
  }
}
