import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { EventTypeEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class EventTypeLoader {
  create(): DataLoader<string, EventTypeEntity | null> {
    return new DataLoader<string, EventTypeEntity | null>(async (ids) => {
      return await useEntityManager(async (manager) => {
        const records = await manager.find(EventTypeEntity, {
          where: { id: In([...ids]) },
        });

        const lookup = new Map(records.map((record) => [record.id, record]));
        return ids.map((id) => lookup.get(id) ?? null);
      });
    });
  }
}
