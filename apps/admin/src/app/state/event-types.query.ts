import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { EventTypesStore, EventTypesState } from './event-types.store';
import { Observable } from 'rxjs';
import { EventType } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class EventTypesQuery extends QueryEntity<EventTypesState> {
  eventTypes$: Observable<EventType[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);

  constructor(protected override store: EventTypesStore) {
    super(store);
  }

  get eventTypes(): EventType[] {
    return this.getAll();
  }

  get loading(): boolean {
    return this.getValue().loading;
  }

  get error(): string | null {
    return this.getValue().error;
  }
}
