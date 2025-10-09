import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { IndustryTypesService } from '../../state/industry-types.service';
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import { SelectComponent } from '../../shared/components/select';
import type { SelectOption } from '../../shared/components/select';

@Component({
  selector: 'app-industry-type-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectComponent],
  templateUrl: './industry-type-editor.component.html',
  host: { class: 'block h-full' }
})
export class IndustryTypeEditorComponent implements OnInit, OnDestroy {
  industryTypeForm: FormGroup;
  isEditMode = false;
  industryTypeId: string | null = null;
  loading = false;

  statusOptions: SelectOption[] = [
    { value: 1, label: '启用' },
    { value: 0, label: '禁用' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private industryTypesService: IndustryTypesService,
    private toastService: ToastService
  ) {
    this.industryTypeForm = this.fb.group({
      industryCode: ['', [Validators.required, Validators.maxLength(50)]],
      industryName: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      sortOrder: [0, [Validators.required, Validators.min(0)]],
      status: [1, Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params['id'];
      if (id && id !== 'create') {
        this.isEditMode = true;
        this.industryTypeId = id;
        this.loadIndustryType();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIndustryType(): void {
    if (!this.industryTypeId) return;

    this.loading = true;
    this.industryTypesService.loadIndustryTypeById(Number(this.industryTypeId)).subscribe({
      next: (industryType) => {
        this.industryTypeForm.patchValue({
          industryCode: industryType.industryCode,
          industryName: industryType.industryName,
          description: industryType.description,
          sortOrder: industryType.sortOrder,
          status: industryType.status
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
    if (this.industryTypeForm.invalid) {
      Object.keys(this.industryTypeForm.controls).forEach(key => {
        const control = this.industryTypeForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const formValue = this.industryTypeForm.value;

    if (this.isEditMode && this.industryTypeId) {
      const dto: UpdateIndustryTypeDto = {
        id: this.industryTypeId,
        ...formValue
      };
      this.updateIndustryType(dto);
    } else {
      const dto: CreateIndustryTypeDto = formValue;
      this.createIndustryType(dto);
    }
  }

  createIndustryType(dto: CreateIndustryTypeDto): void {
    this.loading = true;
    this.industryTypesService.createIndustryType(dto).subscribe({
      next: () => {
        this.toastService.success('行业类型创建成功');
        this.router.navigate(['/events/industry-types']);
      },
      error: (error) => {
        this.toastService.error(`创建失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  updateIndustryType(dto: UpdateIndustryTypeDto): void {
    this.loading = true;
    this.industryTypesService.updateIndustryType(Number(this.industryTypeId), dto).subscribe({
      next: () => {
        this.toastService.success('行业类型更新成功');
        this.router.navigate(['/events/industry-types']);
      },
      error: (error) => {
        this.toastService.error(`更新失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/events/industry-types']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.industryTypeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.industryTypeForm.get(fieldName);
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
    return this.industryTypeForm.get('status') as FormControl;
  }
}
