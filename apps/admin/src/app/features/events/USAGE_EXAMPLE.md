# 事件管理组件使用示例

## 完整示例：事件创建/编辑表单

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AddressCascaderComponent,
  AddressData,
  TagSelectorComponent,
  Tag,
  AttachmentUploaderComponent,
  Attachment,
  AmapPickerComponent,
  LocationData
} from './components';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddressCascaderComponent,
    TagSelectorComponent,
    AttachmentUploaderComponent,
    AmapPickerComponent
  ],
  template: `
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <h2 class="text-2xl font-bold text-gray-900">创建事件</h2>

      <!-- 基础信息 -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 class="text-lg font-semibold">基础信息</h3>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            事件名称 <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            [(ngModel)]="eventForm.eventName"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="请输入事件名称"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">简介</label>
          <textarea
            [(ngModel)]="eventForm.summary"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="请输入事件简介"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            发生时间 <span class="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            [(ngModel)]="eventForm.occurTime"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <!-- 地址信息 -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 class="text-lg font-semibold">地址信息</h3>

        <app-address-cascader
          [province]="eventForm.province"
          [city]="eventForm.city"
          [district]="eventForm.district"
          (addressChange)="onAddressChange($event)"
        ></app-address-cascader>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            街道/详细地址 <span class="text-gray-400 text-xs">(选填)</span>
          </label>
          <input
            type="text"
            [(ngModel)]="eventForm.street"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="请输入详细地址"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            地点文字描述 <span class="text-gray-400 text-xs">(选填)</span>
          </label>
          <input
            type="text"
            [(ngModel)]="eventForm.locationText"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="例如: XX大厦一楼大厅"
          />
        </div>
      </div>

      <!-- 地图选点 -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 class="text-lg font-semibold">地图位置</h3>

        <app-amap-picker
          [longitude]="eventForm.longitude"
          [latitude]="eventForm.latitude"
          [city]="eventForm.city"
          [amapKey]="amapKey"
          (locationPick)="onLocationPick($event)"
        ></app-amap-picker>
      </div>

      <!-- 标签 -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 class="text-lg font-semibold">标签</h3>

        <app-tag-selector
          [selectedTagIds]="eventForm.tagIds"
          [allTags]="allTags"
          [popularTags]="popularTags"
          (tagsChange)="onTagsChange($event)"
          (tagCreate)="onCreateTag($event)"
        ></app-tag-selector>
      </div>

      <!-- 附件 -->
      <div class="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 class="text-lg font-semibold">附件</h3>

        <app-attachment-uploader
          [attachments]="eventForm.attachments"
          (attachmentsChange)="onAttachmentsChange($event)"
          (fileUpload)="onFileUpload($event)"
        ></app-attachment-uploader>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-4">
        <button
          type="button"
          (click)="saveDraft()"
          class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          保存草稿
        </button>
        <button
          type="button"
          (click)="publish()"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          发布
        </button>
      </div>
    </div>
  `
})
export class EventEditorComponent implements OnInit {
  amapKey = 'YOUR_AMAP_KEY'; // 从环境变量获取

  eventForm = {
    eventName: '',
    summary: '',
    occurTime: '',
    province: '',
    city: '',
    district: '',
    street: '',
    locationText: '',
    longitude: undefined as number | undefined,
    latitude: undefined as number | undefined,
    tagIds: [] as number[],
    attachments: [] as Attachment[]
  };

  allTags: Tag[] = []; // 从 API 获取
  popularTags: Tag[] = []; // 从 API 获取

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    // 调用 API 加载标签
  }

  onAddressChange(address: AddressData): void {
    this.eventForm.province = address.province;
    this.eventForm.city = address.city;
    this.eventForm.district = address.district;
  }

  onLocationPick(location: LocationData): void {
    this.eventForm.longitude = location.longitude;
    this.eventForm.latitude = location.latitude;
  }

  onTagsChange(tagIds: number[]): void {
    this.eventForm.tagIds = tagIds;
  }

  onCreateTag(tag: { name: string; color: string }): void {
    // 调用 API 创建标签
    console.log('创建标签:', tag);
  }

  onAttachmentsChange(attachments: Attachment[]): void {
    this.eventForm.attachments = attachments;
  }

  onFileUpload(file: File): void {
    // 上传文件到服务器
    console.log('上传文件:', file);
  }

  saveDraft(): void {
    console.log('保存草稿:', this.eventForm);
    // 调用 API 保存草稿
  }

  publish(): void {
    console.log('发布事件:', this.eventForm);
    // 调用 API 发布事件
  }
}
```

## 事件列表页面示例

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EventFilterPanelComponent,
  EventFilterParams,
  TagCloudComponent,
  Tag,
  DeleteEventDialogComponent,
  EventData
} from './components';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    EventFilterPanelComponent,
    TagCloudComponent,
    DeleteEventDialogComponent
  ],
  template: `
    <div class="container mx-auto p-6">
      <div class="flex gap-6">
        <!-- 左侧筛选面板 -->
        <div class="w-80 flex-shrink-0">
          <app-event-filter-panel
            [filterParams]="filterParams"
            [industryTypes]="industryTypes"
            [eventTypes]="eventTypes"
            [tags]="tags"
            (filterChange)="onFilterChange($event)"
            (reset)="onFilterReset()"
          ></app-event-filter-panel>
        </div>

        <!-- 右侧内容区 -->
        <div class="flex-1 space-y-6">
          <!-- 标签云 -->
          <app-tag-cloud
            [tags]="tags"
            [selectedTagIds]="selectedTags"
            (tagClick)="onTagClick($event)"
          ></app-tag-cloud>

          <!-- 事件列表 -->
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b">
              <h2 class="text-xl font-semibold">事件列表</h2>
            </div>
            <div class="divide-y">
              <div *ngFor="let event of events" class="p-4 hover:bg-gray-50">
                <h3 class="font-medium">{{ event.eventName }}</h3>
                <p class="text-sm text-gray-600 mt-1">{{ event.summary }}</p>
                <div class="flex gap-2 mt-2">
                  <button
                    (click)="viewDetail(event)"
                    class="text-sm text-blue-600 hover:text-blue-700"
                  >
                    查看
                  </button>
                  <button
                    (click)="editEvent(event)"
                    class="text-sm text-blue-600 hover:text-blue-700"
                  >
                    编辑
                  </button>
                  <button
                    (click)="showDeleteDialog(event)"
                    class="text-sm text-red-600 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 删除确认对话框 -->
      <app-delete-event-dialog
        [event]="eventToDelete"
        [isVisible]="deleteDialogVisible"
        (confirm)="onDeleteConfirm()"
        (cancel)="onDeleteCancel()"
      ></app-delete-event-dialog>
    </div>
  `
})
export class EventsListComponent implements OnInit {
  filterParams: EventFilterParams = {};
  industryTypes: any[] = [];
  eventTypes: any[] = [];
  tags: Tag[] = [];
  events: any[] = [];
  selectedTags: number[] = [];

  deleteDialogVisible = false;
  eventToDelete: EventData | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // 加载数据
  }

  onFilterChange(params: EventFilterParams): void {
    this.filterParams = params;
    // 重新加载事件列表
  }

  onFilterReset(): void {
    this.filterParams = {};
    // 重新加载事件列表
  }

  onTagClick(tagId: number): void {
    const index = this.selectedTags.indexOf(tagId);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagId);
    }
    // 根据标签筛选事件
  }

  viewDetail(event: any): void {
    // 跳转详情页
  }

  editEvent(event: any): void {
    // 跳转编辑页
  }

  showDeleteDialog(event: any): void {
    this.eventToDelete = {
      id: event.id,
      eventName: event.eventName,
      status: event.status,
      createdAt: event.createdAt,
      attachmentCount: event.attachmentCount,
      tagCount: event.tagCount
    };
    this.deleteDialogVisible = true;
  }

  onDeleteConfirm(): void {
    if (!this.eventToDelete) return;

    // 调用 API 删除事件
    console.log('删除事件:', this.eventToDelete.id);

    this.deleteDialogVisible = false;
    this.eventToDelete = null;
  }

  onDeleteCancel(): void {
    this.deleteDialogVisible = false;
    this.eventToDelete = null;
  }
}
```

## 地图视图示例

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmapViewerComponent, EventMarker } from './components';

@Component({
  selector: 'app-events-map',
  standalone: true,
  imports: [CommonModule, AmapViewerComponent],
  template: `
    <div class="h-screen p-6">
      <app-amap-viewer
        [markers]="eventMarkers"
        [height]="'100%'"
        [zoom]="12"
        [enableClustering]="true"
        [amapKey]="amapKey"
      ></app-amap-viewer>
    </div>
  `
})
export class EventsMapComponent implements OnInit {
  amapKey = 'YOUR_AMAP_KEY';
  eventMarkers: EventMarker[] = [];

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    // 加载事件并转换为标记
    this.eventMarkers = [
      {
        id: 1,
        longitude: 114.057868,
        latitude: 22.543099,
        title: '深圳市某事件',
        description: '事件描述'
      }
      // ... 更多标记
    ];
  }
}
```

## 注意事项

1. **高德地图 Key**: 记得在环境变量中配置真实的高德地图 API Key
2. **文件上传**: `fileUpload` 事件需要实现实际的文件上传逻辑
3. **API 集成**: 示例中的数据加载需要对接实际的后端 API
4. **错误处理**: 在实际使用中需要添加适当的错误处理
5. **加载状态**: 建议添加 loading 状态提示用户

## 完整项目结构

```
apps/admin/src/app/features/events/
├── components/                           # 基础组件 (已完成)
│   ├── address-cascader.component.ts
│   ├── tag-selector.component.ts
│   ├── attachment-uploader.component.ts
│   ├── amap-picker.component.ts
│   ├── amap-viewer.component.ts
│   ├── event-filter-panel.component.ts
│   ├── tag-cloud.component.ts
│   ├── delete-event-dialog.component.ts
│   └── index.ts
├── events-list.component.ts             # 事件列表页 (待实现)
├── event-editor.component.ts            # 事件编辑页 (待实现)
└── event-detail.component.ts            # 事件详情页 (待实现)
```
