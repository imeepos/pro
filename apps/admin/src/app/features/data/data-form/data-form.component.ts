import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RawData,
  CreateRawDataSourceDto,
  UpdateRawDataDto,
  SourceType,
  SourcePlatform
} from '@pro/types';
import { DataService } from '../services';

@Component({
  selector: 'app-data-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './data-form.component.html',
  styleUrls: ['./data-form.component.scss']
})
export class DataFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dataForm: FormGroup;
  isEditMode = false;
  dataId: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  SourceType = SourceType;
  SourcePlatform = SourcePlatform;

  sourceTypes = [
    { value: SourceType.WEIBO_HTML, label: '微博HTML' },
    { value: SourceType.WEIBO_API_JSON, label: '微博API JSON' },
    { value: SourceType.WEIBO_COMMENT, label: '微博评论' },
    { value: SourceType.JD, label: '京东' },
    { value: SourceType.CUSTOM, label: '自定义' }
  ];

  sourcePlatforms = [
    { value: SourcePlatform.WEIBO, label: '微博' },
    { value: SourcePlatform.JD, label: '京东' },
    { value: SourcePlatform.CUSTOM, label: '自定义' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService
  ) {
    this.dataForm = this.fb.group({
      sourceType: [SourceType.CUSTOM, [Validators.required]],
      sourceUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      rawContent: ['', [Validators.required]],
      metadata: this.fb.group({
        title: [''],
        description: [''],
        tags: [''],
        author: [''],
        publishedAt: ['']
      })
    });
  }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.dataId = params['id'];
          this.isEditMode = true;
          this.loadData();
        }
      });

    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormValidation(): void {
    this.dataForm.get('sourceType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(sourceType => {
        this.updateFormValidationForSourceType(sourceType);
      });
  }

  private updateFormValidationForSourceType(sourceType: SourceType): void {
    const metadataGroup = this.dataForm.get('metadata') as FormGroup;

    switch (sourceType) {
      case SourceType.WEIBO_HTML:
      case SourceType.WEIBO_API_JSON:
      case SourceType.WEIBO_COMMENT:
        metadataGroup.get('author')?.setValidators([Validators.required]);
        break;
      default:
        metadataGroup.get('author')?.clearValidators();
        break;
    }

    metadataGroup.get('author')?.updateValueAndValidity();
  }

  private loadData(): void {
    if (!this.dataId) return;

    this.loading = true;
    this.error = null;

    this.dataService.getData(this.dataId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.loading = false;
          if (data) {
            this.populateForm(data);
          } else {
            this.error = '数据不存在';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error?.message || '加载数据失败';
        }
      });
  }

  private populateForm(data: RawData): void {
    this.dataForm.patchValue({
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      rawContent: data.rawContent,
      metadata: {
        title: data.metadata?.['title'] || '',
        description: data.metadata?.['description'] || '',
        tags: Array.isArray(data.metadata?.['tags'])
          ? data.metadata['tags'].join(', ')
          : data.metadata?.['tags'] || '',
        author: data.metadata?.['author'] || '',
        publishedAt: data.metadata?.['publishedAt']
          ? this.formatDateForInput(data.metadata['publishedAt'])
          : ''
      }
    });
  }

  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  }

  onSubmit(): void {
    if (this.dataForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const formValue = this.dataForm.value;
    const metadata = { ...formValue.metadata };

    if (metadata.tags) {
      metadata.tags = metadata.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    if (this.isEditMode && this.dataId) {
      const updateDto: UpdateRawDataDto = {
        sourceType: formValue.sourceType,
        sourceUrl: formValue.sourceUrl,
        rawContent: formValue.rawContent,
        metadata
      };

      this.dataService.updateData(this.dataId, updateDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.router.navigate(['/data']);
          },
          error: (error) => {
            this.saving = false;
            this.error = error?.message || '更新失败';
          }
        });
    } else {
      const createDto: CreateRawDataSourceDto = {
        sourceType: formValue.sourceType,
        sourceUrl: formValue.sourceUrl,
        rawContent: formValue.rawContent,
        metadata
      };

      this.dataService.createData(createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.router.navigate(['/data']);
          },
          error: (error) => {
            this.saving = false;
            this.error = error?.message || '创建失败';
          }
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/data']);
  }

  onReset(): void {
    if (this.isEditMode && this.dataId) {
      this.loadData();
    } else {
      this.dataForm.reset({
        sourceType: SourceType.CUSTOM,
        sourceUrl: '',
        rawContent: '',
        metadata: {
          title: '',
          description: '',
          tags: '',
          author: '',
          publishedAt: ''
        }
      });
    }
    this.error = null;
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.dataForm.controls).forEach(key => {
      const control = this.dataForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.dataForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return '此字段为必填项';
      if (field.errors['pattern']) return '请输入有效的URL';
      if (field.errors['email']) return '请输入有效的邮箱地址';
      if (field.errors['minlength']) return `至少需要${field.errors['minlength'].requiredLength}个字符`;
      if (field.errors['maxlength']) return `最多允许${field.errors['maxlength'].requiredLength}个字符`;
    }
    return null;
  }

  getMetadataFieldError(fieldName: string): string | null {
    const field = this.dataForm.get(`metadata.${fieldName}`);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return '此字段为必填项';
      if (field.errors['email']) return '请输入有效的邮箱地址';
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dataForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  isMetadataFieldInvalid(fieldName: string): boolean {
    const field = this.dataForm.get(`metadata.${fieldName}`);
    return !!(field?.errors && field.touched);
  }

  get title(): string {
    return this.isEditMode ? '编辑数据' : '新建数据';
  }

  get submitButtonText(): string {
    if (this.saving) {
      return this.isEditMode ? '更新中...' : '创建中...';
    }
    return this.isEditMode ? '更新' : '创建';
  }

  onPreviewContent(): void {
    const content = this.dataForm.get('rawContent')?.value;
    if (content) {
      console.log('预览内容:', content);
    }
  }

  onImportFromUrl(): void {
    const url = this.dataForm.get('sourceUrl')?.value;
    if (url) {
      console.log('从URL导入:', url);
    }
  }
}