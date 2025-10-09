import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { WeiboSearchTasksStore, WeiboSearchTasksState } from './weibo-search-tasks.store';
import { WeiboSearchTask, WeiboSearchTaskFilters, WeiboSearchTaskStatus } from '@pro/types';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WeiboSearchTasksQuery extends Query<WeiboSearchTasksState> {
  tasks$: Observable<WeiboSearchTask[]> = this.select(state => state.tasks);
  selectedTask$: Observable<WeiboSearchTask | null> = this.select(state => state.selectedTask);
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);
  filters$: Observable<WeiboSearchTaskFilters> = this.select(state => state.filters);
  total$: Observable<number> = this.select(state => state.total);
  page$: Observable<number> = this.select(state => state.page);
  limit$: Observable<number> = this.select(state => state.limit);
  totalPages$: Observable<number> = this.select(state => state.totalPages);

  // 过滤后的任务列表
  filteredTasks$: Observable<WeiboSearchTask[]> = this.select(state => state.tasks);

  // 任务统计
  taskStats$ = this.select(state => {
    const tasks = state.tasks;
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
    return this.getValue().tasks;
  }

  get selectedTask(): WeiboSearchTask | null {
    return this.getValue().selectedTask;
  }

  get loading(): boolean {
    return this.getValue().loading;
  }

  get error(): string | null {
    return this.getValue().error;
  }

  get filters(): WeiboSearchTaskFilters {
    return this.getValue().filters;
  }

  get total(): number {
    return this.getValue().total;
  }

  get page(): number {
    return this.getValue().page;
  }

  get limit(): number {
    return this.getValue().limit;
  }

  get totalPages(): number {
    return this.getValue().totalPages;
  }

  // 根据ID查找任务
  selectTaskById(id: number): Observable<WeiboSearchTask | undefined> {
    return this.select(state => state.tasks.find(task => task.id === id));
  }

  // 根据状态筛选任务
  selectTasksByStatus(status: WeiboSearchTaskStatus): Observable<WeiboSearchTask[]> {
    return this.select(state => state.tasks.filter(task => task.status === status));
  }

  // 检查任务是否存在
  hasTask(id: number): boolean {
    return this.getValue().tasks.some(task => task.id === id);
  }

  // 获取错误信息
  getErrorMessage(): string | null {
    return this.getValue().error;
  }
}