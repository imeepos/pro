import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tag } from '@pro/sdk';

@Component({
  selector: 'app-tag-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <!-- 搜索和新建 -->
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <input
            type="text"
            [(ngModel)]="searchKeyword"
            (input)="onSearch()"
            name="searchKeyword"
            placeholder="搜索标签..."
            class="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button"
          (click)="showCreateDialog = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          新建标签
        </button>
      </div>

      <!-- 热门标签 -->
      <div *ngIf="popularTags.length > 0 && !searchKeyword">
        <label class="block text-sm font-medium text-gray-700 mb-2">热门标签</label>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let tag of popularTags"
            type="button"
            (click)="toggleTag(tag.id)"
            [class]="getTagButtonClass(tag.id, tag.tagColor)"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          >
            {{ tag.tagName }}
            <span class="ml-1 text-xs opacity-75">({{ tag.usageCount }})</span>
          </button>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div *ngIf="searchKeyword && filteredTags.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-2">搜索结果</label>
        <div class="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
          <button
            *ngFor="let tag of filteredTags"
            type="button"
            (click)="toggleTag(tag.id)"
            class="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded transition-colors"
          >
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" [style.background-color]="tag.tagColor"></span>
              <span class="text-sm">{{ tag.tagName }}</span>
            </span>
            <span
              *ngIf="isSelected(tag.id)"
              class="text-blue-600"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <!-- 已选标签 -->
      <div *ngIf="selectedTagIds.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          已选标签 ({{ selectedTagIds.length }}/{{ maxTags }})
        </label>
        <div class="flex flex-wrap gap-2">
          <div
            *ngFor="let tagId of selectedTagIds"
            [style.background-color]="getTagById(tagId)?.tagColor"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
          >
            {{ getTagById(tagId)?.tagName }}
            <button
              type="button"
              (click)="removeTag(tagId)"
              class="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 创建标签对话框 -->
      <div
        *ngIf="showCreateDialog"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        (click)="onDialogBackdropClick($event)"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 w-96" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">创建新标签</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                标签名称 <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="newTag.name"
                name="newTagName"
                placeholder="请输入标签名称"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxlength="20"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                标签颜色
              </label>
              <div class="flex gap-2 flex-wrap">
                <button
                  *ngFor="let color of predefinedColors"
                  type="button"
                  (click)="newTag.color = color"
                  [style.background-color]="color"
                  [class.ring-2]="newTag.color === color"
                  [class.ring-offset-2]="newTag.color === color"
                  [class.ring-blue-600]="newTag.color === color"
                  class="w-8 h-8 rounded-full transition-all"
                ></button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              type="button"
              (click)="cancelCreate()"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              (click)="createTag()"
              [disabled]="!newTag.name.trim()"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TagSelectorComponent implements OnInit {
  @Input() selectedTagIds: string[] = [];
  @Input() maxTags = 10;
  @Input() allTags: Tag[] = [];
  @Input() popularTags: Tag[] = [];

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() tagCreate = new EventEmitter<{ name: string; color: string }>();

  searchKeyword = '';
  filteredTags: Tag[] = [];
  showCreateDialog = false;

  newTag = {
    name: '',
    color: '#1890ff'
  };

  predefinedColors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d',
    '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16',
    '#2f54eb', '#a0d911', '#fa541c', '#9254de'
  ];

  ngOnInit(): void {
    this.filteredTags = this.allTags;
  }

  onSearch(): void {
    if (!this.searchKeyword.trim()) {
      this.filteredTags = this.allTags;
      return;
    }

    const keyword = this.searchKeyword.toLowerCase();
    this.filteredTags = this.allTags.filter(tag =>
      tag.tagName.toLowerCase().includes(keyword)
    );
  }

  toggleTag(tagId: string): void {
    const index = this.selectedTagIds.indexOf(tagId);
    if (index > -1) {
      this.selectedTagIds = this.selectedTagIds.filter(id => id !== tagId);
    } else {
      if (this.selectedTagIds.length >= this.maxTags) {
        return;
      }
      this.selectedTagIds = [...this.selectedTagIds, tagId];
    }
    this.tagsChange.emit(this.selectedTagIds);
  }

  removeTag(tagId: string): void {
    this.selectedTagIds = this.selectedTagIds.filter(id => id !== tagId);
    this.tagsChange.emit(this.selectedTagIds);
  }

  isSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

  getTagById(tagId: string): Tag | undefined {
    return this.allTags.find(tag => tag.id === tagId);
  }

  getTagButtonClass(tagId: string, color: string): string {
    if (this.isSelected(tagId)) {
      return `bg-opacity-100 text-white`;
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  }

  createTag(): void {
    if (!this.newTag.name.trim()) {
      return;
    }

    this.tagCreate.emit({
      name: this.newTag.name.trim(),
      color: this.newTag.color
    });

    this.cancelCreate();
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.newTag = {
      name: '',
      color: '#1890ff'
    };
  }

  onDialogBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelCreate();
    }
  }
}
