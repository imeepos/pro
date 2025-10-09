import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventTypesService } from '../../state/event-types.service';
import { CreateEventTypeDto, UpdateEventTypeDto } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-event-type-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './event-type-editor.component.html',
  styleUrls: ['./event-type-editor.component.scss']
})
export class EventTypeEditorComponent implements OnInit, OnDestroy {
  eventTypeForm: FormGroup;
  isEditMode = false;
  eventTypeId: string | null = null;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventTypesService: EventTypesService,
    private toastService: ToastService
  ) {
    this.eventTypeForm = this.fb.group({
      eventCode: ['', [Validators.required, Validators.maxLength(50)]],
      eventName: ['', [Validators.required, Validators.maxLength(100)]],
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
        this.eventTypeId = id;
        this.loadEventType();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEventType(): void {
    if (!this.eventTypeId) return;

    this.loading = true;
    this.eventTypesService.loadEventTypeById(Number(this.eventTypeId)).subscribe({
      next: (eventType) => {
        this.eventTypeForm.patchValue({
          eventCode: eventType.eventCode,
          eventName: eventType.eventName,
          description: eventType.description,
          sortOrder: eventType.sortOrder,
          status: eventType.status
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
    if (this.eventTypeForm.invalid) {
      Object.keys(this.eventTypeForm.controls).forEach(key => {
        const control = this.eventTypeForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const formValue = this.eventTypeForm.value;

    if (this.isEditMode && this.eventTypeId) {
      const dto: UpdateEventTypeDto = {
        id: this.eventTypeId,
        ...formValue
      };
      this.updateEventType(dto);
    } else {
      const dto: CreateEventTypeDto = formValue;
      this.createEventType(dto);
    }
  }

  createEventType(dto: CreateEventTypeDto): void {
    this.loading = true;
    this.eventTypesService.createEventType(dto).subscribe({
      next: () => {
        this.toastService.success('事件类型创建成功');
        this.router.navigate(['/events/event-types']);
      },
      error: (error) => {
        this.toastService.error(`创建失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  updateEventType(dto: UpdateEventTypeDto): void {
    this.loading = true;
    this.eventTypesService.updateEventType(Number(this.eventTypeId), dto).subscribe({
      next: () => {
        this.toastService.success('事件类型更新成功');
        this.router.navigate(['/events/event-types']);
      },
      error: (error) => {
        this.toastService.error(`更新失败: ${error.message}`);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/events/event-types']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventTypeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.eventTypeForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return '此字段为必填项';
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return `最多输入${maxLength}个字符`;
    }
    if (field.errors['min']) return '必须大于等于0';

    return '输入无效';
  }
}
