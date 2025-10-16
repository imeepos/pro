import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TagEntity, EventTagEntity } from '@pro/entities';

@Injectable()
export class TagLoader {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(EventTagEntity)
    private readonly eventTagRepository: Repository<EventTagEntity>,
  ) {}

  createById(): DataLoader<string, TagEntity | null> {
    return new DataLoader<string, TagEntity | null>(async (ids) => {
      const tags = await this.tagRepository.find({
        where: { id: In([...ids]) },
      });

      const lookup = new Map(tags.map((tag) => [tag.id, tag]));
      return ids.map((id) => lookup.get(id) ?? null);
    });
  }

  createByEventId(): DataLoader<string, TagEntity[]> {
    return new DataLoader<string, TagEntity[]>(async (eventIds) => {
      const relations = await this.eventTagRepository.find({
        where: { eventId: In([...eventIds]) },
        relations: ['tag'],
      });

      const grouped = new Map<string, TagEntity[]>();
      for (const relation of relations) {
        if (!relation.tag) {
          continue;
        }

        const existing = grouped.get(relation.eventId);
        if (existing) {
          existing.push(relation.tag);
        } else {
          grouped.set(relation.eventId, [relation.tag]);
        }
      }

      return eventIds.map((eventId) => grouped.get(eventId) ?? []);
    });
  }
}
