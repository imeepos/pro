import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { EventsStore, EventsState } from './events.store';
import { Observable } from 'rxjs';
import { Event } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class EventsQuery extends QueryEntity<EventsState> {
  events$: Observable<Event[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);
  total$: Observable<number> = this.select(state => state.total);

  constructor(protected override store: EventsStore) {
    super(store);
  }

  get events(): Event[] {
    return this.getAll();
  }

  get loading(): boolean {
    return this.getValue().loading;
  }

  get error(): string | null {
    return this.getValue().error;
  }

  get total(): number {
    return this.getValue().total;
  }
}
