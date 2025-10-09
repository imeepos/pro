import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { MediaType } from '@pro/sdk';

export interface MediaTypesState extends EntityState<MediaType> {
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'media-types' })
export class MediaTypesStore extends EntityStore<MediaTypesState> {
  constructor() {
    super({
      loading: false,
      error: null
    });
  }
}
