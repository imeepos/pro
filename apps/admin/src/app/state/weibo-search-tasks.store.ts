import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { WeiboSearchTask, WeiboSearchTaskFilters } from '@pro/types';

export interface WeiboSearchTasksState {
  tasks: WeiboSearchTask[];
  selectedTask: WeiboSearchTask | null;
  loading: boolean;
  error: string | null;
  filters: WeiboSearchTaskFilters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createInitialState(): WeiboSearchTasksState {
  return {
    tasks: [],
    selectedTask: null,
    loading: false,
    error: null,
    filters: {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    },
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'weibo-search-tasks' })
export class WeiboSearchTasksStore extends Store<WeiboSearchTasksState> {
  constructor() {
    super(createInitialState());
  }
}