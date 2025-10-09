import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';
import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { ToastService } from '../../shared/services/toast.service';
import { WeiboSearchTask, CreateWeiboSearchTaskDto, UpdateWeiboSearchTaskDto } from '@pro/types';

@Component({
  selector: 'app-weibo-search-task-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './weibo-search-task-form.component.html',
  styleUrls: ['./weibo-search-task-form.component.scss']
})
export class WeiboSearchTaskFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 表单相关
  validateForm: FormGroup;
  isEditMode = false;
  taskId: number | null = null;
  loading = false;

  // 数据流
  loading$ = this.query.loading$;
  error$ = this.query.error$;
  selectedTask$ = this.query.selectedTask$;

  // 微博账号选项
  weiboAccounts: Array<{ id: number; nickname: string; status: string }> = [];

  // 抓取间隔选项
  crawlIntervalOptions = [
    { label: '30分钟', value: '30m' },
    { label: '1小时', value: '1h' },
    { label: '2小时', value: '2h' },
    { label: '6小时', value: '6h' },
    { label: '12小时', value: '12h' },
    { label: '24小时', value: '24h' }
  ];

  constructor(
    private fb: FormBuilder,
    private service: WeiboSearchTasksService,
    private query: WeiboSearchTasksQuery,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    this.validateForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadWeiboAccounts();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 创建表单
  private createForm(): FormGroup {
    return this.fb.group({
      keyword: [null, [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [null, [Validators.required]],
      crawlInterval: ['1h', [Validators.required]],
      weiboAccountId: [null],
      enableAccountRotation: [true],
      enabled: [true]
    });
  }

  // 初始化订阅
  private initializeSubscriptions(): void {
    // 监听loading状态
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.loading = loading;
    });

    this.selectedTask$.pipe(takeUntil(this.destroy$)).subscribe(task => {
      if (task && this.isEditMode) {
        this.patchForm(task);
      }
    });
  }

  // 检查是否为编辑模式
  private checkEditMode(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id && this.route.snapshot.url.some(segment => segment.path === 'edit')) {
        this.isEditMode = true;
        this.taskId = +id;
        this.loadTask(this.taskId);
      }
    });
  }

  // 加载微博账号列表
  private loadWeiboAccounts(): void {
    // 这里应该调用微博账号服务获取账号列表
    // 暂时使用模拟数据
    this.weiboAccounts = [
      { id: 1, nickname: '测试账号1', status: 'active' },
      { id: 2, nickname: '测试账号2', status: 'active' }
    ];
  }

  // 加载任务详情（编辑模式）
  private loadTask(id: number): void {
    this.service.findOne(id);
  }

  // 填充表单（编辑模式）
  private patchForm(task: WeiboSearchTask): void {
    this.validateForm.patchValue({
      keyword: task.keyword,
      startDate: new Date(task.startDate),
      crawlInterval: task.crawlInterval,
      weiboAccountId: task.weiboAccountId,
      enableAccountRotation: task.enableAccountRotation,
      enabled: task.enabled
    });
  }

  // 提交表单
  submitForm(): void {
    if (this.validateForm.valid) {
      const formValue = this.validateForm.value;

      if (this.isEditMode && this.taskId) {
        this.updateTask(this.taskId, formValue);
      } else {
        this.createTask(formValue);
      }
    } else {
      Object.values(this.validateForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  // 创建任务
  private createTask(formValue: any): void {
    const dto: CreateWeiboSearchTaskDto = {
      keyword: formValue.keyword,
      startDate: formValue.startDate.toISOString().split('T')[0],
      crawlInterval: formValue.crawlInterval,
      weiboAccountId: formValue.weiboAccountId,
      enableAccountRotation: formValue.enableAccountRotation
    };

    this.service.create(dto).subscribe({
      next: () => {
        this.router.navigate(['/weibo-search-tasks']);
      },
      error: (error) => {
        console.error('创建任务失败:', error);
      }
    });
  }

  // 更新任务
  private updateTask(id: number, formValue: any): void {
    const updates: UpdateWeiboSearchTaskDto = {
      keyword: formValue.keyword,
      startDate: formValue.startDate.toISOString().split('T')[0],
      crawlInterval: formValue.crawlInterval,
      weiboAccountId: formValue.weiboAccountId,
      enableAccountRotation: formValue.enableAccountRotation,
      enabled: formValue.enabled
    };

    this.service.update(id, updates).subscribe({
      next: () => {
        this.router.navigate(['/weibo-search-tasks']);
      },
      error: (error) => {
        console.error('更新任务失败:', error);
      }
    });
  }

  // 取消
  cancel(): void {
    this.router.navigate(['/weibo-search-tasks']);
  }

  // 重置表单
  resetForm(): void {
    this.validateForm.reset();
    this.validateForm.patchValue({
      crawlInterval: '1h',
      enableAccountRotation: true,
      enabled: true
    });
  }

  // 表单验证器
  // 关键词验证
  validateKeyword(): string | null {
    const keyword = this.validateForm.get('keyword')?.value;
    if (!keyword) return '请输入搜索关键词';
    if (keyword.length < 1) return '关键词长度至少1个字符';
    if (keyword.length > 100) return '关键词长度不能超过100个字符';
    return null;
  }

  // 起始日期验证
  validateStartDate(): string | null {
    const startDate = this.validateForm.get('startDate')?.value;
    if (!startDate) return '请选择起始日期';
    if (startDate > new Date()) return '起始日期不能大于当前日期';
    return null;
  }

  // 获取表单错误信息
  getFormErrorMessage(field: string): string {
    const control = this.validateForm.get(field);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return '此字段为必填项';
    if (errors['minlength']) return `最少需要 ${errors['minlength'].requiredLength} 个字符`;
    if (errors['maxlength']) return `最多只能有 ${errors['maxlength'].requiredLength} 个字符`;
    return '输入格式不正确';
  }

  // 最大日期（今天）
  get maxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}