import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComponentItem } from '../models/component.model';
import { StyleEditorComponent } from './style-module/style-editor.component';
import { AttrEditorComponent } from './attr-module/attr-editor.component';
import { CanvasQuery } from '../canvas/services/canvas.query';

type TabType = 'style' | 'attr' | 'data' | 'canvas';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, StyleEditorComponent, AttrEditorComponent],
  template: `
    <div
      class="right-sidebar h-full transition-all duration-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700"
      [ngClass]="{ 'w-80': !collapsed, 'w-12': collapsed }"
    >
      <!-- 折叠按钮 -->
      <button
        (click)="toggleCollapse()"
        class="absolute -left-3 top-4 z-10 w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform"
          [ngClass]="{ 'rotate-180': collapsed }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- 展开状态 -->
      <div *ngIf="!collapsed" class="h-full flex flex-col">
        <!-- 选项卡 -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            *ngFor="let tab of tabs"
            (click)="activeTab = tab.key"
            [ngClass]="{
              'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400': activeTab === tab.key,
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200': activeTab !== tab.key
            }"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path [attr.d]="tab.icon" />
              </svg>
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-y-auto">
          <!-- 有选中组件时显示 -->
          <div *ngIf="activeComponent">
            <app-style-editor
              *ngIf="activeTab === 'style'"
              [component]="activeComponent"
            />
            <app-attr-editor
              *ngIf="activeTab === 'attr'"
              [component]="activeComponent"
            />
            <div *ngIf="activeTab === 'data'" class="p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">数据配置功能开发中...</p>
            </div>
          </div>

          <!-- 无选中组件时显示 -->
          <div *ngIf="!activeComponent" class="p-4">
            <div *ngIf="activeTab === 'canvas'" class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">画布设置</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">画布配置功能开发中...</p>
            </div>
            <div *ngIf="activeTab !== 'canvas'" class="text-center py-8">
              <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-sm text-gray-500 dark:text-gray-400">请在画布中选择一个组件</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 折叠状态 -->
      <div *ngIf="collapsed" class="h-full flex flex-col items-center py-4 space-y-4">
        <button
          *ngFor="let tab of visibleTabs"
          (click)="expandAndSetTab(tab.key)"
          [title]="tab.label"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          [ngClass]="{
            'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400': activeTab === tab.key,
            'text-gray-600 dark:text-gray-400': activeTab !== tab.key
          }"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path [attr.d]="tab.icon" />
          </svg>
        </button>
      </div>
    </div>
  `
})
export class RightSidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  activeComponent: ComponentItem | null = null;
  activeTab: TabType = 'attr';

  private destroy$ = new Subject<void>();

  tabs = [
    {
      key: 'style' as TabType,
      label: '样式',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      showWhenActive: true
    },
    {
      key: 'attr' as TabType,
      label: '属性',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      showWhenActive: true
    },
    {
      key: 'data' as TabType,
      label: '数据',
      icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      showWhenActive: true
    },
    {
      key: 'canvas' as TabType,
      label: '画布',
      icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 15a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z',
      showWhenActive: false
    }
  ];

  constructor(private canvasQuery: CanvasQuery) {}

  ngOnInit(): void {
    this.canvasQuery.activeComponent$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(component => {
      this.activeComponent = component;

      if (component && this.activeTab === 'canvas') {
        this.activeTab = 'attr';
      } else if (!component && this.activeTab !== 'canvas') {
        this.activeTab = 'canvas';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleTabs() {
    return this.activeComponent
      ? this.tabs.filter(t => t.showWhenActive)
      : this.tabs.filter(t => !t.showWhenActive);
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  expandAndSetTab(tab: TabType): void {
    this.collapsed = false;
    this.activeTab = tab;
    this.collapsedChange.emit(false);
  }
}
