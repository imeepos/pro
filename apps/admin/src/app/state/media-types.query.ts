import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { MediaTypesStore, MediaTypesState } from './media-types.store';
import { Observable } from 'rxjs';
import { MediaType } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class MediaTypesQuery extends QueryEntity<MediaTypesState> {
  mediaTypes$: Observable<MediaType[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);

  constructor(protected override store: MediaTypesStore) {
    super(store);
  }

  get mediaTypes(): MediaType[] {
    return this.getAll();
  }

  get loading(): boolean {
    return this.getValue().loading;
  }

  get error(): string | null {
    return this.getValue().error;
  }
}
