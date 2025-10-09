import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { IndustryType } from '@pro/sdk';

export interface IndustryTypesState extends EntityState<IndustryType> {
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'industry-types' })
export class IndustryTypesStore extends EntityStore<IndustryTypesState> {
  constructor() {
    super({
      loading: false,
      error: null
    });
  }
}
