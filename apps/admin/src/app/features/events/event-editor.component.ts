import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { TagsService } from '../../state/tags.service';
import { IndustryTypesService } from '../../state/industry-types.service';
import { IndustryTypesQuery } from '../../state/industry-types.query';
import { EventTypesService } from '../../state/event-types.service';
import { EventTypesQuery } from '../../state/event-types.query';
import { CreateEventDto, UpdateEventDto, EventStatus, EventDetail } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import { SelectComponent } from '../../shared/components/select';
import type { SelectOption } from '../../shared/components/select';
import {
  AddressCascaderComponent,
  AmapPickerComponent,
  TagSelectorComponent,
  AttachmentUploaderComponent
} from './components';
import type { LocationData } from './components/amap-picker.component';
import { DateTimePickerComponent } from '../../shared/components/date-time-picker';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectComponent,
    AddressCascaderComponent,
    AmapPickerComponent,
    TagSelectorComponent,
    AttachmentUploaderComponent,
    DateTimePickerComponent
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

  industryTypeOptions: SelectOption[] = [];
  eventTypeOptions: SelectOption[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private tagsService: TagsService,
    private industryTypesService: IndustryTypesService,
    private industryTypesQuery: IndustryTypesQuery,
    private eventTypesService: EventTypesService,
    private eventTypesQuery: EventTypesQuery,
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
    this.loadIndustryTypes();
    this.loadEventTypes();

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

  loadIndustryTypes(): void {
    this.industryTypesService.loadIndustryTypes().subscribe();

    this.industryTypesQuery.industryTypes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(types => {
      this.industryTypeOptions = types.map(type => ({
        value: String(type.id),
        label: type.industryName
      }));
    });
  }

  loadEventTypes(): void {
    this.eventTypesService.loadEventTypes().subscribe();

    this.eventTypesQuery.eventTypes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(types => {
      this.eventTypeOptions = types.map(type => ({
        value: String(type.id),
        label: type.eventName
      }));
    });
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
          occurTime: event.occurTime ? new Date(event.occurTime) : null,
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

  onLocationPick(location: LocationData): void {
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

    // 转换日期格式
    const processedValue = {
      ...formValue,
      occurTime: formValue.occurTime instanceof Date
        ? formValue.occurTime.toISOString()
        : formValue.occurTime
    };

    this.loading = true;

    if (this.isEditMode && this.eventId) {
      const updateDto: UpdateEventDto = {
        id: this.eventId!,
        ...processedValue,
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
        ...processedValue,
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

  get industryTypeIdControl(): FormControl {
    return this.eventForm.get('industryTypeId') as FormControl;
  }

  get eventTypeIdControl(): FormControl {
    return this.eventForm.get('eventTypeId') as FormControl;
  }
}
