import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { ScreensStore, ScreensState } from './screens.store';
import { Observable } from 'rxjs';
import { ScreenPage } from '../core/services/screen-api.service';

@Injectable({ providedIn: 'root' })
export class ScreensQuery extends QueryEntity<ScreensState> {
  screens$: Observable<ScreenPage[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);
  total$: Observable<number> = this.select(state => state.total);

  constructor(protected override store: ScreensStore) {
    super(store);
  }

  get screens(): ScreenPage[] {
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
