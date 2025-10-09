import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressCascaderComponent, AddressData } from './address-cascader.component';
import { Tag, IndustryType, EventType } from '@pro/sdk';
import { EventStatus } from '@pro/sdk';
import { EventQueryParams } from '@pro/sdk';

export interface EventFilterParams extends Omit<EventQueryParams, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'> {}

@Component({
  selector: 'app-event-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AddressCascaderComponent],
  template: `
    <div class="filter-panel-container">
      <!-- 筛选面板头部 -->
      <div class="filter-header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-900">筛选条件</h3>
          </div>
          <button
            type="button"
            (click)="onReset()"
            class="reset-btn"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="filter-stats">
          <span class="active-filters-badge">
            {{ getActiveFiltersCount() }} 个筛选条件
          </span>
        </div>
      </div>

      <!-- 筛选内容区域 -->
      <div class="filter-content">
        <!-- 快速筛选组 -->
        <div class="filter-section">
          <h4 class="section-title">快速筛选</h4>

          <div class="filter-row">
            <!-- 行业类型 -->
            <div class="filter-item">
              <label class="filter-label">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                行业类型
              </label>
              <select
                [(ngModel)]="filterParams.industryTypeId"
                (ngModelChange)="onIndustryChange()"
                class="modern-select"
              >
                <option [value]="undefined">全部行业</option>
                <option *ngFor="let industry of industryTypes" [value]="industry.id">
                  {{ industry.industryName }}
                </option>
              </select>
            </div>

            <!-- 事件类型 -->
            <div class="filter-item">
              <label class="filter-label">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                事件类型
              </label>
              <select
                [(ngModel)]="filterParams.eventTypeId"
                class="modern-select"
              >
                <option [value]="undefined">全部类型</option>
                <option *ngFor="let eventType of eventTypes" [value]="eventType.id">
                  {{ eventType.eventName }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 时空筛选组 -->
        <div class="filter-section">
          <h4 class="section-title">时空筛选</h4>

          <!-- 地区筛选 -->
          <div class="filter-item">
            <label class="filter-label">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              事件地区
            </label>
            <app-address-cascader
              [province]="filterParams.province"
              [city]="filterParams.city"
              [district]="filterParams.district"
              [showFullAddress]="false"
              (addressChange)="onAddressChange($event)"
            ></app-address-cascader>
          </div>

          <!-- 时间范围 -->
          <div class="filter-item">
            <label class="filter-label">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              发生时间
            </label>
            <div class="date-range-container">
              <input
                type="date"
                [(ngModel)]="filterParams.startTime"
                class="date-input"
                placeholder="开始日期"
              />
              <span class="date-separator">至</span>
              <input
                type="date"
                [(ngModel)]="filterParams.endTime"
                class="date-input"
                placeholder="结束日期"
              />
            </div>
          </div>
        </div>

        <!-- 状态和标签筛选 -->
        <div class="filter-section">
          <div class="filter-row">
            <!-- 状态筛选 -->
            <div class="filter-item">
              <label class="filter-label">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                事件状态
              </label>
              <div class="status-checkbox-group">
                <label class="status-checkbox">
                  <input
                    type="checkbox"
                    [checked]="isStatusSelected(EventStatus.DRAFT)"
                    (change)="toggleStatus(EventStatus.DRAFT)"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label draft">草稿</span>
                </label>
                <label class="status-checkbox">
                  <input
                    type="checkbox"
                    [checked]="isStatusSelected(EventStatus.PUBLISHED)"
                    (change)="toggleStatus(EventStatus.PUBLISHED)"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label published">已发布</span>
                </label>
                <label class="status-checkbox">
                  <input
                    type="checkbox"
                    [checked]="isStatusSelected(EventStatus.ARCHIVED)"
                    (change)="toggleStatus(EventStatus.ARCHIVED)"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label archived">已归档</span>
                </label>
              </div>
            </div>

            <!-- 标签筛选 -->
            <div class="filter-item" *ngIf="tags.length > 0">
              <label class="filter-label">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                相关标签
              </label>
              <div class="tags-container">
                <label
                  *ngFor="let tag of tags.slice(0, 8)"
                  class="tag-checkbox"
                >
                  <input
                    type="checkbox"
                    [checked]="isTagSelected(tag.id)"
                    (change)="toggleTag(tag.id)"
                    class="checkbox-input"
                  />
                  <span class="tag-label">
                    <span class="tag-color" [style.background-color]="tag.tagColor"></span>
                    {{ tag.tagName }}
                  </span>
                </label>
                <div *ngIf="tags.length > 8" class="more-tags-hint">
                  还有 {{ tags.length - 8 }} 个标签...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="filter-footer">
        <button
          type="button"
          (click)="onReset()"
          class="reset-footer-btn"
        >
          重置条件
        </button>
        <button
          type="button"
          (click)="onFilter()"
          class="apply-filter-btn"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          应用筛选
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .filter-panel-container {
      height: 100%;
      background: linear-gradient(to bottom, #ffffff, #f8fafc);
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
    }

    .filter-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .filter-stats {
      margin-top: 0.75rem;
    }

    .active-filters-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
    }

    .reset-btn {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      color: #6b7280;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reset-btn:hover {
      background: #e5e7eb;
      color: #374151;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .filter-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .filter-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filter-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-label {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: #4b5563;
    }

    .modern-select {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      background: white;
      font-size: 0.875rem;
      color: #374151;
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.75rem center;
      background-repeat: no-repeat;
      background-size: 1.25rem 1.25rem;
      transition: all 0.2s ease;
    }

    .modern-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .modern-select:disabled {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .date-range-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .date-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #374151;
      transition: all 0.2s ease;
    }

    .date-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .date-separator {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .status-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .checkbox-input {
      width: 1.125rem;
      height: 1.125rem;
      border: 2px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .checkbox-input:checked {
      background: #3b82f6;
      border-color: #3b82f6;
    }

    .checkbox-label {
      margin-left: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .checkbox-label.draft {
      background: #f3f4f6;
      color: #6b7280;
    }

    .checkbox-input:checked + .checkbox-label.draft {
      background: #e5e7eb;
      color: #374151;
    }

    .checkbox-label.published {
      background: #d1fae5;
      color: #065f46;
    }

    .checkbox-input:checked + .checkbox-label.published {
      background: #10b981;
      color: white;
    }

    .checkbox-label.archived {
      background: #dbeafe;
      color: #1e40af;
    }

    .checkbox-input:checked + .checkbox-label.archived {
      background: #3b82f6;
      color: white;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .tag-label {
      display: flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      background: #f3f4f6;
      color: #374151;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tag-color {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      margin-right: 0.375rem;
    }

    .checkbox-input:checked + .tag-label {
      background: #3b82f6;
      color: white;
      transform: scale(1.05);
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }

    .more-tags-hint {
      color: #6b7280;
      font-size: 0.75rem;
      font-style: italic;
      padding: 0.375rem 0.75rem;
    }

    .filter-footer {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: white;
      display: flex;
      gap: 1rem;
    }

    .reset-footer-btn {
      flex: 1;
      padding: 0.75rem 1.5rem;
      background: #f3f4f6;
      color: #374151;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reset-footer-btn:hover {
      background: #e5e7eb;
      border-color: #d1d5db;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .apply-filter-btn {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .apply-filter-btn:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
    }

    @media (max-width: 768px) {
      .filter-row {
        grid-template-columns: 1fr;
      }

      .filter-content {
        padding: 1rem;
      }
    }
  `]
})
export class EventFilterPanelComponent implements OnInit {
  EventStatus = EventStatus;
  @Input() filterParams: EventFilterParams = {};
  @Input() industryTypes: IndustryType[] = [];
  @Input() eventTypes: EventType[] = [];
  @Input() tags: Tag[] = [];

  @Output() filterChange = new EventEmitter<EventFilterParams>();
  @Output() reset = new EventEmitter<void>();

  filteredEventTypes: EventType[] = [];
  selectedStatuses: EventStatus[] = [];

  ngOnInit(): void {
    this.filteredEventTypes = this.eventTypes;
    if (this.filterParams.status !== undefined) {
      this.selectedStatuses = [this.filterParams.status];
    }
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filterParams.industryTypeId) count++;
    if (this.filterParams.eventTypeId) count++;
    if (this.filterParams.province || this.filterParams.city || this.filterParams.district) count++;
    if (this.filterParams.startTime || this.filterParams.endTime) count++;
    if (this.filterParams.status !== undefined) count++;
    if (this.filterParams.tagIds && this.filterParams.tagIds.length > 0) count++;
    return count;
  }

  onIndustryChange(): void {
    this.filteredEventTypes = this.eventTypes;
  }

  onAddressChange(address: AddressData): void {
    this.filterParams.province = address.province;
    this.filterParams.city = address.city;
    this.filterParams.district = address.district;
  }

  isStatusSelected(status: EventStatus): boolean {
    return this.selectedStatuses.includes(status);
  }

  toggleStatus(status: EventStatus): void {
    const index = this.selectedStatuses.indexOf(status);
    if (index > -1) {
      this.selectedStatuses = this.selectedStatuses.filter(s => s !== status);
    } else {
      this.selectedStatuses = [...this.selectedStatuses, status];
    }

    this.filterParams.status = this.selectedStatuses.length === 1
      ? this.selectedStatuses[0]
      : undefined;
  }

  isTagSelected(tagId: string): boolean {
    return this.filterParams.tagIds?.includes(tagId) || false;
  }

  toggleTag(tagId: string): void {
    if (!this.filterParams.tagIds) {
      this.filterParams.tagIds = [];
    }

    const index = this.filterParams.tagIds.indexOf(tagId);
    if (index > -1) {
      this.filterParams.tagIds = this.filterParams.tagIds.filter(id => id !== tagId);
    } else {
      this.filterParams.tagIds = [...this.filterParams.tagIds, tagId];
    }

    if (this.filterParams.tagIds.length === 0) {
      this.filterParams.tagIds = undefined;
    }
  }

  onFilter(): void {
    this.filterChange.emit(this.filterParams);
  }

  onReset(): void {
    this.filterParams = {};
    this.selectedStatuses = [];
    this.filteredEventTypes = this.eventTypes;
    this.reset.emit();
  }
}