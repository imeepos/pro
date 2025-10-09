import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { Event } from '@pro/sdk';

export interface EventsState extends EntityState<Event> {
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'events' })
export class EventsStore extends EntityStore<EventsState> {
  constructor() {
    super({
      loading: false,
      error: null,
      total: 0,
      page: 1,
      limit: 20
    });
  }
}
