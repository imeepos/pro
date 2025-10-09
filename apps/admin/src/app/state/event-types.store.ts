import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { EventType } from '@pro/sdk';

export interface EventTypesState extends EntityState<EventType> {
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'event-types' })
export class EventTypesStore extends EntityStore<EventTypesState> {
  constructor() {
    super({
      loading: false,
      error: null
    });
  }
}
