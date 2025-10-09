import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { Tag } from '@pro/sdk';

export interface TagsState extends EntityState<Tag> {
  loading: boolean;
  error: string | null;
  total: number;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'tags' })
export class TagsStore extends EntityStore<TagsState> {
  constructor() {
    super({
      loading: false,
      error: null,
      total: 0
    });
  }
}
