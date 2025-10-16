import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IndustryTypeEntity } from '@pro/entities';

@Injectable()
export class IndustryTypeLoader {
  constructor(
    @InjectRepository(IndustryTypeEntity)
    private readonly industryTypeRepository: Repository<IndustryTypeEntity>,
  ) {}

  create(): DataLoader<string, IndustryTypeEntity | null> {
    return new DataLoader<string, IndustryTypeEntity | null>(async (ids) => {
      const records = await this.industryTypeRepository.find({
        where: { id: In([...ids]) },
      });

      const lookup = new Map(records.map((record) => [record.id, record]));
      return ids.map((id) => lookup.get(id) ?? null);
    });
  }
}
