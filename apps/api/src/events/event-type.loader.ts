import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventTypeEntity } from '@pro/entities';

@Injectable()
export class EventTypeLoader {
  constructor(
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepository: Repository<EventTypeEntity>,
  ) {}

  create(): DataLoader<string, EventTypeEntity | null> {
    return new DataLoader<string, EventTypeEntity | null>(async (ids) => {
      const records = await this.eventTypeRepository.find({
        where: { id: In([...ids]) },
      });

      const lookup = new Map(records.map((record) => [record.id, record]));
      return ids.map((id) => lookup.get(id) ?? null);
    });
  }
}
