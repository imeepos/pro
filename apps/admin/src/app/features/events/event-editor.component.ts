import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, Observable } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { TagsService } from '../../state/tags.service';
import { TagsQuery } from '../../state/tags.query';
import { IndustryTypesService } from '../../state/industry-types.service';
import { IndustryTypesQuery } from '../../state/industry-types.query';
import { EventTypesService } from '../../state/event-types.service';
import { EventTypesQuery } from '../../state/event-types.query';
import { CreateEventDto, UpdateEventDto, EventStatus, EventDetail, Tag } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import { SelectComponent } from '../../shared/components/select';
import type { SelectOption } from '../../shared/components/select';
import {
  AmapPickerComponent,
  TagSelectorComponent
} from './components';
import type { LocationData } from './components/amap-picker.component';
import { DateTimePickerComponent } from '../../shared/components/date-time-picker/date-time-picker.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { VideoUploadComponent } from '../../shared/components/video-upload/video-upload.component';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectComponent,
    AmapPickerComponent,
    TagSelectorComponent,
    DateTimePickerComponent,
    ImageUploadComponent,
    FileUploadComponent,
    VideoUploadComponent
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

  existingImages: Attachment[] = [];
  existingDocuments: Attachment[] = [];
  existingVideos: Attachment[] = [];

  industryTypeOptions: SelectOption[] = [];
  eventTypeOptions: SelectOption[] = [];

  allTags$: Observable<Tag[]> = new Observable();
  popularTags$: Observable<Tag[]> = new Observable();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private tagsService: TagsService,
    private tagsQuery: TagsQuery,
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
    this.loadTags();

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
        label: type.industryCode
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

  loadTags(): void {
    this.tagsService.loadTags().subscribe();
    this.allTags$ = this.tagsQuery.tags$;
    this.popularTags$ = this.tagsQuery.tags$.pipe(
      // 取前50个作为热门标签，实际应用中可以根据usageCount排序
      takeUntil(this.destroy$)
    );
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
          this.categorizeAttachments(event.attachments);
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

  onLocationPick(location: LocationData): void {
    // 自动填充所有地址相关字段
    this.eventForm.patchValue({
      longitude: location.longitude,
      latitude: location.latitude,
      province: location.province,
      city: location.city,
      district: location.district,
      street: location.street,
      locationText: location.locationText
    });

    console.log('地址信息已自动填充:', {
      province: location.province,
      city: location.city,
      district: location.district,
      street: location.street,
      locationText: location.locationText,
      longitude: location.longitude,
      latitude: location.latitude
    });
  }

  onTagsChange(tagIds: string[]): void {
    this.selectedTagIds = tagIds;
  }

  onTagCreate(tagData: { name: string; color: string }): void {
    this.tagsService.createTag({
      tagName: tagData.name,
      tagColor: tagData.color
    }).subscribe({
      next: (newTag: Tag) => {
        this.toastService.success('标签创建成功');
        // 自动选中新创建的标签
        this.selectedTagIds = [...this.selectedTagIds, newTag.id];
      },
      error: (error) => {
        this.toastService.error(`创建标签失败: ${error.message}`);
      }
    });
  }

  categorizeAttachments(attachments: Attachment[]): void {
    this.existingImages = attachments.filter(att => att.fileType === 'image');
    this.existingDocuments = attachments.filter(att => att.fileType === 'document');
    this.existingVideos = attachments.filter(att => att.fileType === 'video');
  }

  onImageUploadSuccess(attachment: Attachment): void {
    this.existingImages = [...this.existingImages, attachment];
    this.toastService.success('图片上传成功');
  }

  onImageUploadError(error: Error): void {
    this.toastService.error(`图片上传失败: ${error.message}`);
  }

  onImageDeleteSuccess(attachmentId: string): void {
    this.existingImages = this.existingImages.filter(img => img.id !== attachmentId);
    this.toastService.success('图片删除成功');
  }

  onFileUploadSuccess(attachment: Attachment): void {
    this.existingDocuments = [...this.existingDocuments, attachment];
    this.toastService.success('文件上传成功');
  }

  onFileUploadError(error: Error): void {
    this.toastService.error(`文件上传失败: ${error.message}`);
  }

  onFileDeleteSuccess(attachmentId: string): void {
    this.existingDocuments = this.existingDocuments.filter(doc => doc.id !== attachmentId);
    this.toastService.success('文件删除成功');
  }

  onVideoUploadSuccess(attachment: Attachment): void {
    this.existingVideos = [...this.existingVideos, attachment];
    this.toastService.success('视频上传成功');
  }

  onVideoUploadError(error: Error): void {
    this.toastService.error(`视频上传失败: ${error.message}`);
  }

  onVideoDeleteSuccess(attachmentId: string): void {
    this.existingVideos = this.existingVideos.filter(vid => vid.id !== attachmentId);
    this.toastService.success('视频删除成功');
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
