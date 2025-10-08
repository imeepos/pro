import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { ScreenPage } from '../core/services/screen-api.service';

export interface ScreensState extends EntityState<ScreenPage> {
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'screens' })
export class ScreensStore extends EntityStore<ScreensState> {
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
