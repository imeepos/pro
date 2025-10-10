import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { WeiboSearchTasksStore, WeiboSearchTasksState } from './weibo-search-tasks.store';
import { WeiboSearchTask, WeiboSearchTaskFilters, WeiboSearchTaskStatus } from '@pro/types';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WeiboSearchTasksQuery extends Query<WeiboSearchTasksState> {
  tasks$: Observable<WeiboSearchTask[]> = this.select(state => state?.tasks || []);
  selectedTask$: Observable<WeiboSearchTask | null> = this.select(state => state?.selectedTask || null);
  loading$: Observable<boolean> = this.select(state => state?.loading || false);
  error$: Observable<string | null> = this.select(state => state?.error || null);
  filters$: Observable<WeiboSearchTaskFilters> = this.select(state => state?.filters || {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  total$: Observable<number> = this.select(state => state?.total || 0);
  page$: Observable<number> = this.select(state => state?.page || 1);
  limit$: Observable<number> = this.select(state => state?.limit || 20);
  totalPages$: Observable<number> = this.select(state => state?.totalPages || 0);

  // 过滤后的任务列表
  filteredTasks$: Observable<WeiboSearchTask[]> = this.select(state => state?.tasks || []);

  // 任务统计
  taskStats$ = this.select(state => {
    const tasks = state?.tasks || [];
    return {
      total: tasks.length,
      enabled: tasks.filter(t => t.enabled).length,
      disabled: tasks.filter(t => !t.enabled).length,
      running: tasks.filter(t => t.status === WeiboSearchTaskStatus.RUNNING).length,
      pending: tasks.filter(t => t.status === WeiboSearchTaskStatus.PENDING).length,
      failed: tasks.filter(t => t.status === WeiboSearchTaskStatus.FAILED).length,
      paused: tasks.filter(t => t.status === WeiboSearchTaskStatus.PAUSED).length
    };
  });

  constructor(protected override store: WeiboSearchTasksStore) {
    super(store);
  }

  get tasks(): WeiboSearchTask[] {
    try {
      const state = this.getValue();
      return state?.tasks || [];
    } catch (error) {
      console.warn('Failed to get tasks from query, returning empty array:', error);
      return [];
    }
  }

  get selectedTask(): WeiboSearchTask | null {
    try {
      const state = this.getValue();
      return state?.selectedTask || null;
    } catch (error) {
      console.warn('Failed to get selectedTask from query:', error);
      return null;
    }
  }

  get loading(): boolean {
    try {
      const state = this.getValue();
      return state?.loading || false;
    } catch (error) {
      console.warn('Failed to get loading from query:', error);
      return false;
    }
  }

  get error(): string | null {
    try {
      const state = this.getValue();
      return state?.error || null;
    } catch (error) {
      console.warn('Failed to get error from query:', error);
      return null;
    }
  }

  get filters(): WeiboSearchTaskFilters {
    try {
      const state = this.getValue();
      return state?.filters || {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
    } catch (error) {
      console.warn('Failed to get filters from query:', error);
      return {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
    }
  }

  get total(): number {
    try {
      const state = this.getValue();
      return state?.total || 0;
    } catch (error) {
      console.warn('Failed to get total from query:', error);
      return 0;
    }
  }

  get page(): number {
    try {
      const state = this.getValue();
      return state?.page || 1;
    } catch (error) {
      console.warn('Failed to get page from query:', error);
      return 1;
    }
  }

  get limit(): number {
    try {
      const state = this.getValue();
      return state?.limit || 20;
    } catch (error) {
      console.warn('Failed to get limit from query:', error);
      return 20;
    }
  }

  get totalPages(): number {
    try {
      const state = this.getValue();
      return state?.totalPages || 0;
    } catch (error) {
      console.warn('Failed to get totalPages from query:', error);
      return 0;
    }
  }

  // 根据ID查找任务
  selectTaskById(id: number): Observable<WeiboSearchTask | undefined> {
    return this.select(state => (state?.tasks || []).find(task => task.id === id));
  }

  // 根据状态筛选任务
  selectTasksByStatus(status: WeiboSearchTaskStatus): Observable<WeiboSearchTask[]> {
    return this.select(state => (state?.tasks || []).filter(task => task.status === status));
  }

  // 检查任务是否存在
  hasTask(id: number): boolean {
    try {
      const state = this.getValue();
      return (state?.tasks || []).some(task => task.id === id);
    } catch (error) {
      console.warn('Failed to check task existence:', error);
      return false;
    }
  }

  // 获取错误信息
  getErrorMessage(): string | null {
    try {
      const state = this.getValue();
      return state?.error || null;
    } catch (error) {
      console.warn('Failed to get error message from query:', error);
      return null;
    }
  }
}