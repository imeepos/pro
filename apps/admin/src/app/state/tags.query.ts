import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { TagsStore, TagsState } from './tags.store';
import { Observable } from 'rxjs';
import { Tag } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class TagsQuery extends QueryEntity<TagsState> {
  tags$: Observable<Tag[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);
  total$: Observable<number> = this.select(state => state.total);

  constructor(protected override store: TagsStore) {
    super(store);
  }

  get tags(): Tag[] {
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
