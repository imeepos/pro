import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tag } from '@pro/sdk';

@Component({
  selector: 'app-tag-cloud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tag-cloud-container">
      <div class="tag-cloud-header">
        <div class="header-left">
          <h3 class="tag-cloud-title">
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            热门标签
          </h3>
          <span class="tag-count">{{ tags.length }} 个标签</span>
        </div>
        <div class="header-actions">
          <button
            (click)="clearAllTags()"
            *ngIf="selectedTagIds.length > 0"
            class="clear-tags-btn"
            type="button"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            清除选择
          </button>
        </div>
      </div>

      <div class="tag-cloud-content">
        <div *ngIf="tags.length === 0" class="empty-tags">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p class="empty-text">暂无标签数据</p>
          <p class="empty-hint">创建标签后，可快速筛选事件</p>
        </div>

        <div *ngIf="tags.length > 0" class="tag-cloud-grid">
          <button
            *ngFor="let tag of sortedTags"
            type="button"
            (click)="onTagClick(tag.id)"
            class="tag-item"
            [class.selected]="isSelected(tag.id)"
            [style.--tag-color]="tag.tagColor"
            [style.--tag-size]="getFontSize(tag.usageCount) + 'px'"
            [style.--tag-weight]="getFontWeight(tag.usageCount)"
            [title]="'标签: ' + tag.tagName + ' (使用次数: ' + tag.usageCount + ')'"
          >
            <span class="tag-dot"></span>
            <span class="tag-text">{{ tag.tagName }}</span>
            <span class="tag-count-badge">{{ tag.usageCount }}</span>
          </button>
        </div>

        <!-- 选中标签预览 -->
        <div *ngIf="selectedTagIds.length > 0" class="selected-tags-preview">
          <div class="preview-header">
            <span class="preview-label">已选择:</span>
            <span class="preview-count">{{ selectedTagIds.length }} 个标签</span>
          </div>
          <div class="selected-tags-list">
            <span
              *ngFor="let tagId of selectedTagIds"
              class="selected-tag-preview"
              [style.background-color]="getTagColor(tagId)"
            >
              {{ getTagName(tagId) }}
              <button
                (click)="removeTag(tagId)"
                class="remove-tag-btn"
                type="button"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tag-cloud-container {
      background: white;
      border-radius: 1rem;
      overflow: hidden;
    }

    .tag-cloud-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .tag-cloud-title {
      display: flex;
      align-items: center;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .tag-count {
      background: #f1f5f9;
      color: #64748b;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .clear-tags-btn {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-tags-btn:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      transform: translateY(-1px);
    }

    .tag-cloud-content {
      padding: 1.5rem 2rem;
    }

    .empty-tags {
      text-align: center;
      padding: 2rem 0;
    }

    .empty-text {
      color: #6b7280;
      font-size: 0.9375rem;
      font-weight: 500;
      margin: 0 0 0.5rem 0;
    }

    .empty-hint {
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0;
    }

    .tag-cloud-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .tag-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: linear-gradient(135deg, #f8fafc, #ffffff);
      border: 2px solid #e2e8f0;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .tag-item:hover:not(.selected) {
      border-color: var(--tag-color);
      background: var(--tag-color);
      background: linear-gradient(135deg, var(--tag-color), var(--tag-color));
      color: white;
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .tag-item.selected {
      background: var(--tag-color);
      color: white;
      border-color: var(--tag-color);
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .tag-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.8;
    }

    .tag-text {
      font-size: var(--tag-size);
      font-weight: var(--tag-weight);
      color: inherit;
      white-space: nowrap;
    }

    .tag-count-badge {
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(4px);
    }

    .tag-item:not(.selected):not(:hover) .tag-count-badge {
      background: #f1f5f9;
      color: #64748b;
    }

    .selected-tags-preview {
      background: #f8fafc;
      border-radius: 0.75rem;
      padding: 1rem;
      border: 1px solid #e2e8f0;
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .preview-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .preview-count {
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .selected-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .selected-tag-preview {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      color: white;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .remove-tag-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .remove-tag-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    /* 动画效果 */
    @keyframes tagAppear {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .tag-item {
      animation: tagAppear 0.3s ease-out;
      animation-fill-mode: both;
    }

    .tag-item:nth-child(1) { animation-delay: 0.05s; }
    .tag-item:nth-child(2) { animation-delay: 0.1s; }
    .tag-item:nth-child(3) { animation-delay: 0.15s; }
    .tag-item:nth-child(4) { animation-delay: 0.2s; }
    .tag-item:nth-child(5) { animation-delay: 0.25s; }
    .tag-item:nth-child(n+6) { animation-delay: 0.3s; }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .tag-cloud-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        padding: 1rem;
      }

      .header-left {
        justify-content: center;
      }

      .tag-cloud-content {
        padding: 1rem;
      }

      .tag-cloud-grid {
        gap: 0.5rem;
      }

      .tag-item {
        padding: 0.5rem 0.75rem;
      }

      .tag-text {
        font-size: 0.875rem;
      }

      .selected-tags-preview {
        padding: 0.75rem;
      }
    }
  `]
})
export class TagCloudComponent {
  @Input() tags: Tag[] = [];
  @Input() selectedTagIds: string[] = [];
  @Input() minFontSize = 12;
  @Input() maxFontSize = 18;

  @Output() tagClick = new EventEmitter<string>();

  get sortedTags(): Tag[] {
    return [...this.tags].sort((a, b) => b.usageCount - a.usageCount);
  }

  getFontSize(usageCount: number): number {
    if (this.tags.length === 0) {
      return this.minFontSize;
    }

    const maxCount = Math.max(...this.tags.map(t => t.usageCount));
    const minCount = Math.min(...this.tags.map(t => t.usageCount));

    if (maxCount === minCount) {
      return (this.minFontSize + this.maxFontSize) / 2;
    }

    const ratio = (usageCount - minCount) / (maxCount - minCount);
    return Math.round(this.minFontSize + ratio * (this.maxFontSize - this.minFontSize));
  }

  getFontWeight(usageCount: number): number {
    if (this.tags.length === 0) return 500;

    const maxCount = Math.max(...this.tags.map(t => t.usageCount));
    const minCount = Math.min(...this.tags.map(t => t.usageCount));

    if (maxCount === minCount) return 600;

    const ratio = (usageCount - minCount) / (maxCount - minCount);
    return Math.round(500 + ratio * 200); // 500-700
  }

  isSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

  onTagClick(tagId: string): void {
    this.tagClick.emit(tagId);
  }

  clearAllTags(): void {
    // Emit an array with all selected tag IDs to remove them
    this.selectedTagIds.forEach(tagId => {
      this.tagClick.emit(tagId);
    });
  }

  removeTag(tagId: string): void {
    this.tagClick.emit(tagId);
  }

  getTagColor(tagId: string): string {
    const tag = this.tags.find(t => t.id === tagId);
    return tag?.tagColor || '#6b7280';
  }

  getTagName(tagId: string): string {
    const tag = this.tags.find(t => t.id === tagId);
    return tag?.tagName || '';
  }
}
