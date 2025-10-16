import DataLoader = require('dataloader');
import { User } from '@pro/types';
import { EventTypeEntity, IndustryTypeEntity, TagEntity } from '@pro/entities';
import { ApiKeyResponseDto } from '../../auth/dto/api-key.dto';

export interface GraphqlLoaders {
  userById: DataLoader<string, User | null>;
  apiKeyById: DataLoader<number, ApiKeyResponseDto | null>;
  eventTypeById: DataLoader<string, EventTypeEntity | null>;
  industryTypeById: DataLoader<string, IndustryTypeEntity | null>;
  tagById: DataLoader<string, TagEntity | null>;
  tagsByEventId: DataLoader<string, TagEntity[]>;
}
