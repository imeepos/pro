import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MediaTypesService } from '../../../state/media-types.service';
import { CreateMediaTypeDto, UpdateMediaTypeDto } from '@pro/sdk';
import { ToastService } from '../../../shared/services/toast.service';
import { SelectComponent } from '../../../shared/components/select';
import type { SelectOption } from '../../../shared/components/select';

@Component({
  selector: 'app-media-type-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectComponent],
  templateUrl: './media-type-form.component.html'
})
export class MediaTypeFormComponent implements OnInit, OnDestroy {
  mediaTypeForm: FormGroup;
  isEditMode = false;
  mediaTypeId: number | null = null;
  loading = false;

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: '启用' },
    { value: 'INACTIVE', label: '禁用' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private mediaTypesService: MediaTypesService,
    private toastService: ToastService
  ) {
    this.mediaTypeForm = this.fb.group({
      typeCode: ['', [Validators.required, Validators.maxLength(50)]],
      typeName: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      sort: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params['id'];
      if (id && id !== 'new') {
        this.isEditMode = true;
        this.mediaTypeId = Number(id);
        this.loadMediaType();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMediaType(): void {
    if (!this.mediaTypeId) return;

    this.loading = true;
    this.mediaTypesService.loadMediaTypeById(this.mediaTypeId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (mediaType) => {
        this.mediaTypeForm.patchValue({
          typeCode: mediaType.typeCode,
          typeName: mediaType.typeName,
          description: mediaType.description,
          sort: mediaType.sort,
          status: mediaType.status
        });
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error(`加载失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.mediaTypeForm.invalid) {
      Object.keys(this.mediaTypeForm.controls).forEach(key => {
        const control = this.mediaTypeForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const formValue = this.mediaTypeForm.value;

    if (this.isEditMode && this.mediaTypeId) {
      const dto: UpdateMediaTypeDto = formValue;
      this.updateMediaType(dto);
    } else {
      const dto: CreateMediaTypeDto = formValue;
      this.createMediaType(dto);
    }
  }

  createMediaType(dto: CreateMediaTypeDto): void {
    this.loading = true;
    this.mediaTypesService.createMediaType(dto).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('媒体类型创建成功');
        this.router.navigate(['/media-type']);
      },
      error: (error) => {
        this.toastService.error(`创建失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  updateMediaType(dto: UpdateMediaTypeDto): void {
    if (!this.mediaTypeId) return;

    this.loading = true;
    this.mediaTypesService.updateMediaType(this.mediaTypeId, dto).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('媒体类型更新成功');
        this.router.navigate(['/media-type']);
      },
      error: (error) => {
        this.toastService.error(`更新失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/media-type']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.mediaTypeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.mediaTypeForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return '此字段为必填项';
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return `最多输入${maxLength}个字符`;
    }
    if (field.errors['min']) return '必须大于等于0';

    return '输入无效';
  }

  get statusControl(): FormControl {
    return this.mediaTypeForm.get('status') as FormControl;
  }
}
