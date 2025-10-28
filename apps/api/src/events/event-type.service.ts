import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  EventTypeEntity,
  useEntityManager,
} from '@pro/entities';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto';

@Injectable()
export class EventTypeService {

  async create(createDto: CreateEventTypeDto): Promise<EventTypeEntity> {
    return useEntityManager(async (manager) => {
      const existing = await manager.getRepository(EventTypeEntity).findOne({
        where: { eventCode: createDto.eventCode },
      });

      if (existing) {
        throw new ConflictException(`事件类型编码 ${createDto.eventCode} 已存在`);
      }

      const eventType = manager.getRepository(EventTypeEntity).create(createDto);
      return manager.getRepository(EventTypeEntity).save(eventType);
    });
  }

  async findAll(): Promise<EventTypeEntity[]> {
    return useEntityManager(async (manager) => {
      return manager.getRepository(EventTypeEntity).find({
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
    });
  }

  async findOne(id: string): Promise<EventTypeEntity> {
    return useEntityManager(async (manager) => {
      const eventType = await manager.getRepository(EventTypeEntity).findOne({
        where: { id },
      });

      if (!eventType) {
        throw new NotFoundException(`事件类型 ID ${id} 不存在`);
      }

      return eventType;
    });
  }

  async update(
    id: string,
    updateDto: UpdateEventTypeDto,
  ): Promise<EventTypeEntity> {
    return useEntityManager(async (manager) => {
      const eventType = await this.findOne(id);

      if (updateDto.eventCode && updateDto.eventCode !== eventType.eventCode) {
        const existing = await manager.getRepository(EventTypeEntity).findOne({
          where: { eventCode: updateDto.eventCode },
        });

        if (existing) {
          throw new ConflictException(`事件类型编码 ${updateDto.eventCode} 已存在`);
        }
      }

      Object.assign(eventType, updateDto);
      return manager.getRepository(EventTypeEntity).save(eventType);
    });
  }

  async remove(id: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const eventType = await this.findOne(id);

      const eventCount = await manager.getRepository(EventTypeEntity)
        .createQueryBuilder('eventType')
        .leftJoin('eventType.events', 'event')
        .where('eventType.id = :id', { id })
        .getCount();

      if (eventCount > 0) {
        throw new ConflictException('该事件类型下存在关联事件,无法删除');
      }

      await manager.getRepository(EventTypeEntity).remove(eventType);
    });
  }
}
