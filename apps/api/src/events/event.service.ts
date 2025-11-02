import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { In, SelectQueryBuilder } from 'typeorm';
import {
  EventEntity,
  EventStatus,
  EventTagEntity,
  TagEntity,
  useEntityManager,
  useTranslation
} from '@pro/entities';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  EventMapQueryDto,
} from './dto/event.dto';

type EventFilterOptions = {
  keyword?: string;
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  city?: string;
  district?: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
  tagIds?: string[];
};

@Injectable()
export class EventService {
  private readonly filterAliases = {
    eventTag: 'filterEventTag',
    tag: 'filterTag',
  };

  async create(createDto: CreateEventDto, userId: string) {
    return useEntityManager(async (manager) => {
      const { tagIds, ...eventData } = createDto;

      const event = manager.getRepository(EventEntity).create({
        ...eventData,
        createdBy: userId,
      });

      const savedEvent = await manager.getRepository(EventEntity).save(event);

      if (tagIds && tagIds.length > 0) {
        await this.addTagsToEvent(savedEvent.id, tagIds, manager);
      }

      return this.findOne(savedEvent.id);
    });
  }

  async findAll(queryDto: EventQueryDto) {
    return useEntityManager(async (manager) => {
      const {
        page = 1,
        pageSize = 20,
        keyword,
        industryTypeId,
        eventTypeId,
        province,
        city,
        district,
        startTime,
        endTime,
        status,
        tagIds,
      } = queryDto;

      const query = manager.getRepository(EventEntity)
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.eventType', 'eventType')
        .leftJoinAndSelect('event.industryType', 'industryType')
        .leftJoinAndSelect('event.eventTags', 'eventTags')
        .leftJoinAndSelect('eventTags.tag', 'tag')
        .leftJoinAndSelect('event.attachments', 'attachments');

      this.applyFilterConditions(query, {
        keyword,
        industryTypeId,
        eventTypeId,
        province,
        city,
        district,
        startTime,
        endTime,
        status,
        tagIds,
      });

      const [items, total] = await query
        .orderBy('event.occurTime', 'DESC')
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

  async findOne(id: string) {
    return useEntityManager(async (manager) => {
      const event = await manager.getRepository(EventEntity).findOne({
        where: { id },
        relations: ['eventType', 'industryType', 'eventTags', 'eventTags.tag', 'attachments'],
      });

      if (!event) {
        throw new NotFoundException(`事件 ID ${id} 不存在`);
      }

      return event;
    });
  }

  async update(id: string, updateDto: UpdateEventDto, userId: string) {
    return useTranslation(async (transaction) => {
      const event = await this.findOne(id);

      if (event.createdBy !== userId) {
        throw new BadRequestException('只能修改自己创建的事件');
      }

      const { tagIds, ...eventData } = updateDto;

      Object.assign(event, eventData);
      const savedEvent = await transaction.getRepository(EventEntity).save(event);

      if (tagIds !== undefined) {
        await transaction.getRepository(EventTagEntity).delete({ eventId: id });

        if (tagIds.length > 0) {
          await this.addTagsToEvent(id, tagIds, transaction);
        }
      }

      return this.findOne(id);
    });
  }

  async remove(id: string, userId: string) {
    return useEntityManager(async (manager) => {
      const event = await this.findOne(id);

      if (event.createdBy !== userId) {
        throw new BadRequestException('只能删除自己创建的事件');
      }

      await manager.getRepository(EventEntity).remove(event);
      return { message: '事件删除成功' };
    });
  }

  async publish(id: string, userId: string) {
    return useEntityManager(async (manager) => {
      const event = await this.findOne(id);

      if (event.createdBy !== userId) {
        throw new BadRequestException('只能发布自己创建的事件');
      }

      event.status = EventStatus.PUBLISHED;
      return manager.getRepository(EventEntity).save(event);
    });
  }

  async archive(id: string, userId: string) {
    return useEntityManager(async (manager) => {
      const event = await this.findOne(id);

      if (event.createdBy !== userId) {
        throw new BadRequestException('只能归档自己创建的事件');
      }

      event.status = EventStatus.ARCHIVED;
      return manager.getRepository(EventEntity).save(event);
    });
  }

  async findNearby(longitude: number, latitude: number, radius: number) {
    return useEntityManager(async (manager) => {
      const radiusInDegrees = radius / 111;

      const events = await manager.getRepository(EventEntity)
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.eventType', 'eventType')
        .leftJoinAndSelect('event.industryType', 'industryType')
        .where('event.status = :status', { status: EventStatus.PUBLISHED })
        .andWhere('event.longitude IS NOT NULL AND event.latitude IS NOT NULL')
        .andWhere(
          `(
            6371 * acos(
              cos(radians(:latitude)) *
              cos(radians(event.latitude)) *
              cos(radians(event.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) *
              sin(radians(event.latitude))
            )
          ) <= :radius`,
          { longitude, latitude, radius },
        )
        .orderBy(
          `(
            6371 * acos(
              cos(radians(:latitude)) *
              cos(radians(event.latitude)) *
              cos(radians(event.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) *
              sin(radians(event.latitude))
            )
          )`,
        )
        .getMany();

      return events;
    });
  }

  async findByTag(tagId: string) {
    return useEntityManager(async (manager) => {
      const eventTags = await manager.getRepository(EventTagEntity).find({
        where: { tagId },
        relations: ['event', 'event.eventType', 'event.industryType'],
      });

      return eventTags.map((et) => et.event);
    });
  }

  async findForMap(queryDto: EventMapQueryDto) {
    return useEntityManager(async (manager) => {
      const {
        keyword,
        industryTypeId,
        eventTypeId,
        province,
        city,
        district,
        startTime,
        endTime,
        status,
        tagIds,
      } = queryDto;

      const query = manager.getRepository(EventEntity)
        .createQueryBuilder('event')
        .select([
          'event.id',
          'event.eventName',
          'event.summary',
          'event.occurTime',
          'event.province',
          'event.city',
          'event.district',
          'event.street',
          'event.longitude',
          'event.latitude',
          'event.status',
          'event.eventTypeId',
          'event.industryTypeId',
        ]);

      const effectiveStatus =
        status === undefined ? EventStatus.PUBLISHED : status;

      this.applyFilterConditions(query, {
        keyword,
        industryTypeId,
        eventTypeId,
        province,
        city,
        district,
        startTime,
        endTime,
        status: effectiveStatus,
        tagIds,
      });

      query.andWhere('event.longitude IS NOT NULL');
      query.andWhere('event.latitude IS NOT NULL');
      query.orderBy('event.occurTime', 'DESC');

      return query.getMany();
    });
  }

  async addTagsToEvent(eventId: string, tagIds: string[], manager?: any) {
    if (manager) {
      const existingTags = await manager.getRepository(TagEntity).findBy({
        id: In(tagIds),
      });

      if (existingTags.length !== tagIds.length) {
        throw new BadRequestException('部分标签不存在');
      }

      const eventTags = tagIds.map((tagId) =>
        manager.getRepository(EventTagEntity).create({ eventId, tagId }),
      );

      await manager.getRepository(EventTagEntity).save(eventTags);

      await manager.getRepository(TagEntity).increment(
        { id: In(tagIds) },
        'usageCount',
        1,
      );
    } else {
      return useEntityManager(async (entityManager) => {
        const existingTags = await entityManager.getRepository(TagEntity).findBy({
          id: In(tagIds),
        });

        if (existingTags.length !== tagIds.length) {
          throw new BadRequestException('部分标签不存在');
        }

        const eventTags = tagIds.map((tagId) =>
          entityManager.getRepository(EventTagEntity).create({ eventId, tagId }),
        );

        await entityManager.getRepository(EventTagEntity).save(eventTags);

        await entityManager.getRepository(TagEntity).increment(
          { id: In(tagIds) },
          'usageCount',
          1,
        );
      });
    }
  }

  async removeTagFromEvent(eventId: string, tagId: string) {
    return useTranslation(async (transaction) => {
      const eventTag = await transaction.getRepository(EventTagEntity).findOne({
        where: { eventId, tagId },
      });

      if (!eventTag) {
        throw new NotFoundException('事件标签关联不存在');
      }

      await transaction.getRepository(EventTagEntity).remove(eventTag);

      await transaction.getRepository(TagEntity).decrement({ id: tagId }, 'usageCount', 1);

      return { message: '标签移除成功' };
    });
  }

  private applyFilterConditions(
    query: SelectQueryBuilder<EventEntity>,
    filters: EventFilterOptions,
  ): void {
    const {
      keyword,
      industryTypeId,
      eventTypeId,
      province,
      city,
      district,
      startTime,
      endTime,
      status,
      tagIds,
    } = filters;

    if (keyword) {
      query.andWhere(
        '(event.eventName LIKE :keyword OR event.summary LIKE :keyword)',
        {
          keyword: `%${keyword}%`,
        },
      );
    }

    if (industryTypeId) {
      query.andWhere('event.industryTypeId = :industryTypeId', {
        industryTypeId,
      });
    }

    if (eventTypeId) {
      query.andWhere('event.eventTypeId = :eventTypeId', { eventTypeId });
    }

    if (province) {
      query.andWhere('event.province = :province', { province });
    }

    if (city) {
      query.andWhere('event.city = :city', { city });
    }

    if (district) {
      query.andWhere('event.district = :district', { district });
    }

    if (startTime) {
      query.andWhere('event.occurTime >= :startTime', { startTime });
    }

    if (endTime) {
      query.andWhere('event.occurTime <= :endTime', { endTime });
    }

    if (status !== undefined) {
      query.andWhere('event.status = :status', { status });
    }

    if (tagIds && tagIds.length > 0) {
      query.leftJoin('event.eventTags', this.filterAliases.eventTag);
      query.leftJoin(
        `${this.filterAliases.eventTag}.tag`,
        this.filterAliases.tag,
      );
      query.andWhere(`${this.filterAliases.tag}.id IN (:...tagIds)`, {
        tagIds,
      });
    }
  }
}
