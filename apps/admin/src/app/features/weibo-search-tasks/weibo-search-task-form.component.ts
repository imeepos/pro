import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { CreateWeiboSearchTaskDto, UpdateWeiboSearchTaskDto, WeiboSearchTask } from '@pro/types';

import { ToastService } from '../../shared/services/toast.service';
import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-weibo-search-task-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './weibo-search-task-form.component.html',
  styleUrls: ['./weibo-search-task-form.component.scss'],
})
export class WeiboSearchTaskFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  form: FormGroup;
  isEditMode = false;
  taskId: number | null = null;
  loading = false;

  crawlIntervalOptions: SelectOption[] = [
    { label: '30分钟', value: '30m' },
    { label: '1小时', value: '1h' },
    { label: '2小时', value: '2h' },
    { label: '6小时', value: '6h' },
    { label: '12小时', value: '12h' },
    { label: '24小时', value: '24h' },
  ];

  loading$ = this.query.loading$;
  selectedTask$ = this.query.selectedTask$;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: WeiboSearchTasksService,
    private readonly query: WeiboSearchTasksQuery,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService,
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.detectEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      keyword: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [null, [Validators.required]],
      crawlInterval: ['1h', [Validators.required]],
      enabled: [true],
    });
  }

  private initializeSubscriptions(): void {
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      if (!this.destroy$.closed) {
        this.loading = loading;
      }
    });

    this.selectedTask$.pipe(takeUntil(this.destroy$)).subscribe(task => {
      if (task && this.isEditMode) {
        this.patchForm(task);
      }
    });
  }

  private detectEditMode(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id && this.route.snapshot.url.some(segment => segment.path === 'edit')) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
          this.isEditMode = true;
          this.taskId = numericId;
          this.loadTask(numericId);
        }
      }
    });
  }

  private loadTask(id: number): void {
    this.service.findOne(id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => console.error('加载任务失败:', error),
    });
  }

  private patchForm(task: WeiboSearchTask): void {
    this.form.patchValue({
      keyword: task.keyword,
      startDate: task.startDate instanceof Date ? task.startDate : new Date(task.startDate),
      crawlInterval: task.crawlInterval,
      enabled: task.enabled,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;

    if (this.isEditMode && this.taskId !== null) {
      const dto: UpdateWeiboSearchTaskDto = {
        keyword: value.keyword,
        startDate: this.normalizeDate(value.startDate),
        crawlInterval: value.crawlInterval,
        enabled: value.enabled,
      };

      this.service.update(this.taskId, dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.router.navigate(['/weibo-search-tasks']),
        error: error => this.toast.error(error.message || '更新任务失败'),
      });
    } else {
      const dto: CreateWeiboSearchTaskDto = {
        keyword: value.keyword,
        startDate: this.normalizeDate(value.startDate),
        crawlInterval: value.crawlInterval,
      };

      this.service.create(dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.router.navigate(['/weibo-search-tasks']),
        error: error => this.toast.error(error.message || '创建任务失败'),
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/weibo-search-tasks']);
  }

  reset(): void {
    this.form.reset({
      keyword: '',
      startDate: null,
      crawlInterval: '1h',
      enabled: true,
    });
  }

  get keywordControl(): FormControl {
    return this.form.get('keyword') as FormControl;
  }

  get startDateControl(): FormControl {
    return this.form.get('startDate') as FormControl;
  }

  get crawlIntervalControl(): FormControl {
    return this.form.get('crawlInterval') as FormControl;
  }

  get enabledControl(): FormControl {
    return this.form.get('enabled') as FormControl;
  }

  get maxDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get maxDateObj(): Date {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }

  private normalizeDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new Error('无效的日期格式');
  }
}
