import DataLoader = require('dataloader');
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiKeyEntity } from '@pro/entities';
import { ApiKeyService } from './api-key.service';
import { ApiKeyResponseDto } from './dto/api-key.dto';

@Injectable()
export class ApiKeyLoader {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  create(resolveUserId: () => string | undefined): DataLoader<number, ApiKeyResponseDto | null> {
    return new DataLoader<number, ApiKeyResponseDto | null>(async (ids) => {
      const userId = resolveUserId();

      if (!userId) {
        return ids.map(() => null);
      }

      const records = await this.apiKeyRepo.find({
        where: {
          id: In(ids as number[]),
          userId,
        },
      });

      const mapped = records.map((record) => this.apiKeyService.toResponse(record));
      const lookup = new Map<number, ApiKeyResponseDto>(mapped.map((dto) => [dto.id, dto]));

      return ids.map((id) => lookup.get(id) ?? null);
    });
  }
}
