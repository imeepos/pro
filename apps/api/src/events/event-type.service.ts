import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTypeEntity } from '@pro/entities';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto';

@Injectable()
export class EventTypeService {
  constructor(
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepository: Repository<EventTypeEntity>,
  ) {}

  async create(createDto: CreateEventTypeDto): Promise<EventTypeEntity> {
    const existing = await this.eventTypeRepository.findOne({
      where: { eventCode: createDto.eventCode },
    });

    if (existing) {
      throw new ConflictException(`事件类型编码 ${createDto.eventCode} 已存在`);
    }

    const eventType = this.eventTypeRepository.create(createDto);
    return this.eventTypeRepository.save(eventType);
  }

  async findAll(): Promise<EventTypeEntity[]> {
    return this.eventTypeRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<EventTypeEntity> {
    const eventType = await this.eventTypeRepository.findOne({
      where: { id },
    });

    if (!eventType) {
      throw new NotFoundException(`事件类型 ID ${id} 不存在`);
    }

    return eventType;
  }

  async update(
    id: string,
    updateDto: UpdateEventTypeDto,
  ): Promise<EventTypeEntity> {
    const eventType = await this.findOne(id);

    if (updateDto.eventCode && updateDto.eventCode !== eventType.eventCode) {
      const existing = await this.eventTypeRepository.findOne({
        where: { eventCode: updateDto.eventCode },
      });

      if (existing) {
        throw new ConflictException(`事件类型编码 ${updateDto.eventCode} 已存在`);
      }
    }

    Object.assign(eventType, updateDto);
    return this.eventTypeRepository.save(eventType);
  }

  async remove(id: string): Promise<void> {
    const eventType = await this.findOne(id);

    const eventCount = await this.eventTypeRepository
      .createQueryBuilder('eventType')
      .leftJoin('eventType.events', 'event')
      .where('eventType.id = :id', { id })
      .getCount();

    if (eventCount > 0) {
      throw new ConflictException('该事件类型下存在关联事件,无法删除');
    }

    await this.eventTypeRepository.remove(eventType);
  }
}
