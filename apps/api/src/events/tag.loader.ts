import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { TagEntity, EventTagEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class TagLoader {
  createById(): DataLoader<string, TagEntity | null> {
    return new DataLoader<string, TagEntity | null>(async (ids) => {
      return await useEntityManager(async (manager) => {
        const tags = await manager.find(TagEntity, {
          where: { id: In([...ids]) },
        });

        const lookup = new Map(tags.map((tag) => [tag.id, tag]));
        return ids.map((id) => lookup.get(id) ?? null);
      });
    });
  }

  createByEventId(): DataLoader<string, TagEntity[]> {
    return new DataLoader<string, TagEntity[]>(async (eventIds) => {
      return await useEntityManager(async (manager) => {
        const relations = await manager.find(EventTagEntity, {
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
    });
  }
}
