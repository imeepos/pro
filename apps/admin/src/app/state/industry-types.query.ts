import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { IndustryTypesStore, IndustryTypesState } from './industry-types.store';
import { Observable } from 'rxjs';
import { IndustryType } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class IndustryTypesQuery extends QueryEntity<IndustryTypesState> {
  industryTypes$: Observable<IndustryType[]> = this.selectAll();
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);

  constructor(protected override store: IndustryTypesStore) {
    super(store);
  }

  get industryTypes(): IndustryType[] {
    return this.getAll();
  }

  get loading(): boolean {
    return this.getValue().loading;
  }

  get error(): string | null {
    return this.getValue().error;
  }
}
