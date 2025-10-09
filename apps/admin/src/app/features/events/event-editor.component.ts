import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { TagsService } from '../../state/tags.service';
import { CreateEventDto, UpdateEventDto, EventStatus, EventDetail } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import {
  AddressCascaderComponent,
  AmapPickerComponent,
  TagSelectorComponent,
  AttachmentUploaderComponent
} from './components';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AddressCascaderComponent,
    AmapPickerComponent,
    TagSelectorComponent,
    AttachmentUploaderComponent
  ],
  templateUrl: './event-editor.component.html',
  host: { class: 'block h-full' }
})
export class EventEditorComponent implements OnInit, OnDestroy {
  eventForm: FormGroup;
  isEditMode = false;
  eventId: string | null = null;
  loading = false;
  selectedTagIds: string[] = [];
  attachments: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private tagsService: TagsService,
    private toastService: ToastService
  ) {
    this.eventForm = this.fb.group({
      eventName: ['', [Validators.required, Validators.maxLength(200)]],
      eventTypeId: [null, Validators.required],
      industryTypeId: [null, Validators.required],
      summary: [''],
      occurTime: ['', Validators.required],
      province: ['', Validators.required],
      city: ['', Validators.required],
      district: [''],
      street: [''],
      locationText: [''],
      longitude: [null],
      latitude: [null],
      status: [EventStatus.DRAFT]
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params['id'];
      if (id && id !== 'create') {
        this.isEditMode = true;
        this.eventId = id;
        this.loadEvent();
      }
    });

    this.tagsService.loadPopularTags(50).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvent(): void {
    if (!this.eventId) return;

    this.loading = true;
    this.eventsService.loadEventDetail(this.eventId).subscribe({
      next: (event: EventDetail) => {
        this.eventForm.patchValue({
          eventName: event.eventName,
          eventTypeId: event.eventTypeId,
          industryTypeId: event.industryTypeId,
          summary: event.summary,
          occurTime: event.occurTime,
          province: event.province,
          city: event.city,
          district: event.district,
          street: event.street,
          locationText: event.locationText,
          longitude: event.longitude,
          latitude: event.latitude,
          status: event.status
        });

        if (event.tags) {
          this.selectedTagIds = event.tags.map(tag => tag.id);
        }

        if (event.attachments) {
          this.attachments = event.attachments as any[];
        }

        this.loading = false;
      },
      error: (error) => {
        this.toastService.error(`加载事件失败: ${error.message}`);
        this.loading = false;
        this.router.navigate(['/events']);
      }
    });
  }

  onAddressChange(address: { province: string; city: string; district?: string }): void {
    this.eventForm.patchValue({
      province: address.province,
      city: address.city,
      district: address.district
    });
  }

  onLocationPick(location: { longitude: number; latitude: number; address?: string }): void {
    this.eventForm.patchValue({
      longitude: location.longitude,
      latitude: location.latitude
    });

    if (location.address) {
      this.eventForm.patchValue({
        locationText: location.address
      });
    }
  }

  onTagsChange(tagIds: string[]): void {
    this.selectedTagIds = tagIds;
  }

  onAttachmentsChange(attachments: any[]): void {
    this.attachments = attachments;
  }

  saveDraft(): void {
    if (this.eventForm.invalid) {
      this.toastService.error('请填写必填字段');
      this.markFormGroupTouched(this.eventForm);
      return;
    }

    this.eventForm.patchValue({ status: EventStatus.DRAFT });
    this.save();
  }

  publish(): void {
    if (this.eventForm.invalid) {
      this.toastService.error('请填写必填字段');
      this.markFormGroupTouched(this.eventForm);
      return;
    }

    this.eventForm.patchValue({ status: EventStatus.PUBLISHED });
    this.save();
  }

  private save(): void {
    const formValue = this.eventForm.value;

    this.loading = true;

    if (this.isEditMode && this.eventId) {
      const updateDto: UpdateEventDto = {
        id: this.eventId!,
        ...formValue,
        tagIds: this.selectedTagIds
      };

      this.eventsService.updateEvent(this.eventId!, updateDto).subscribe({
        next: () => {
          this.toastService.success('事件更新成功');
          this.router.navigate(['/events']);
        },
        error: (error) => {
          this.toastService.error(`更新失败: ${error.message}`);
          this.loading = false;
        }
      });
    } else {
      const createDto: CreateEventDto = {
        ...formValue,
        tagIds: this.selectedTagIds
      };

      this.eventsService.createEvent(createDto).subscribe({
        next: () => {
          this.toastService.success('事件创建成功');
          this.router.navigate(['/events']);
        },
        error: (error) => {
          this.toastService.error(`创建失败: ${error.message}`);
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/events']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get title(): string {
    return this.isEditMode ? '编辑事件' : '创建事件';
  }
}
