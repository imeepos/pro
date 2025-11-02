import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { IndustryTypeEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class IndustryTypeLoader {
  create(): DataLoader<string, IndustryTypeEntity | null> {
    return new DataLoader<string, IndustryTypeEntity | null>(async (ids) => {
      return await useEntityManager(async (manager) => {
        const records = await manager.find(IndustryTypeEntity, {
          where: { id: In([...ids]) },
        });

        const lookup = new Map(records.map((record) => [record.id, record]));
        return ids.map((id) => lookup.get(id) ?? null);
      });
    });
  }
}
