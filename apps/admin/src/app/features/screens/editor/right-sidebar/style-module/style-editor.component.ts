import { Component, Input, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ComponentItem, ComponentStyle } from '../../models/component.model';
import { FormMetadata, FormChangeEvent, ValidationResult } from '../../models/form-metadata.model';
import { FormContainerComponent } from '../form-controls/form-container.component';
import { FormItemComponent } from '../form-controls/form-item.component';
import { ValidationService } from '../../services/validation.service';
import { CanvasService } from '../../canvas/services/canvas.service';

@Component({
  selector: 'app-style-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FormContainerComponent],
  template: `
    <div class="style-editor p-4 overflow-y-auto space-y-6">
      <!-- 验证摘要 -->
      <div
        *ngIf="showValidationSummary && !isFormValid"
        class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      >
        <div class="flex items-start">
          <svg class="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">验证失败</h3>
            <div class="mt-1 text-sm text-red-700 dark:text-red-300">
              <p>请修正以下问题后再继续操作：</p>
              <ul class="mt-1 ml-4 list-disc space-y-1">
                <li *ngFor="let error of getValidationErrors()">{{ error }}</li>
              </ul>
            </div>
          </div>
          <button
            (click)="showValidationSummary = false"
            class="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 位置设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
            位置
          </h3>
          <button
            type="button"
            (click)="resetGroup('position')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置位置设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="positionConfig"
            [formData]="formData.position"
            (change)="onPositionChange($event)"
          />
        </div>
      </div>

      <!-- 尺寸设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            尺寸
          </h3>
          <button
            type="button"
            (click)="resetGroup('size')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置尺寸设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="sizeConfig"
            [formData]="formData.size"
            (change)="onSizeChange($event)"
          />
        </div>
      </div>

      <!-- 变换设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            变换
          </h3>
          <button
            type="button"
            (click)="resetGroup('transform')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置变换设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="transformConfig"
            [formData]="formData.transform"
            (change)="onTransformChange($event)"
          />
        </div>
      </div>

      <!-- 边框设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            边框
          </h3>
          <button
            type="button"
            (click)="resetGroup('border')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置边框设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="borderConfig"
            [formData]="formData.border"
            (change)="onBorderChange($event)"
          />
        </div>
      </div>

      <!-- 背景设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            背景
          </h3>
          <button
            type="button"
            (click)="resetGroup('background')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置背景设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="backgroundConfig"
            [formData]="formData.background"
            (change)="onBackgroundChange($event)"
          />
        </div>
      </div>

      <!-- 层级设置 -->
      <div class="style-group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="group-header px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            层级
          </h3>
          <button
            type="button"
            (click)="resetGroup('layer')"
            class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 flex items-center"
            title="重置层级设置"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置
          </button>
        </div>
        <div class="p-4 space-y-4">
          <app-form-container
            [config]="layerConfig"
            [formData]="formData.layer"
            (change)="onLayerChange($event)"
          />
        </div>
      </div>
    </div>
  `
})
export class StyleEditorComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;

  formData: any = {};
  styleConfig: FormMetadata[] = [];

  // 分组配置
  positionConfig: FormMetadata[] = [];
  sizeConfig: FormMetadata[] = [];
  transformConfig: FormMetadata[] = [];
  borderConfig: FormMetadata[] = [];
  backgroundConfig: FormMetadata[] = [];
  layerConfig: FormMetadata[] = [];

  // 验证相关
  validationResults: { [key: string]: ValidationResult } = {};
  isFormValid: boolean = true;
  showValidationSummary: boolean = false;

  @ViewChildren(FormItemComponent) formItems!: QueryList<FormItemComponent>;

  private destroy$ = new Subject<void>();
  private changeSubject$ = new Subject<FormChangeEvent>();

  constructor(
    private canvasService: CanvasService,
    private validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.buildStyleConfigs();
    this.buildFormData();
    this.setupChangeHandler();
    this.setupValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildStyleConfigs(): void {
    // 位置配置
    this.positionConfig = [
      {
        type: 'number',
        label: 'X坐标',
        key: 'left',
        min: 0,
        step: 1,
        tooltip: '组件在画布上的X坐标',
        required: true,
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(0, 'X坐标不能小于0'),
          ValidationService.createRules.required('X坐标为必填项')
        ]
      },
      {
        type: 'number',
        label: 'Y坐标',
        key: 'top',
        min: 0,
        step: 1,
        tooltip: '组件在画布上的Y坐标',
        required: true,
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(0, 'Y坐标不能小于0'),
          ValidationService.createRules.required('Y坐标为必填项')
        ]
      }
    ];

    // 尺寸配置
    this.sizeConfig = [
      {
        type: 'number',
        label: '宽度',
        key: 'width',
        min: 1,
        step: 1,
        tooltip: '组件宽度',
        required: true,
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(1, '宽度不能小于1像素'),
          ValidationService.createRules.max(5000, '宽度不能超过5000像素'),
          ValidationService.createRules.required('宽度为必填项')
        ]
      },
      {
        type: 'number',
        label: '高度',
        key: 'height',
        min: 1,
        step: 1,
        tooltip: '组件高度',
        required: true,
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(1, '高度不能小于1像素'),
          ValidationService.createRules.max(5000, '高度不能超过5000像素'),
          ValidationService.createRules.required('高度为必填项')
        ]
      }
    ];

    // 变换配置
    this.transformConfig = [
      {
        type: 'slider',
        label: '旋转角度',
        key: 'rotate',
        min: 0,
        max: 360,
        step: 1,
        tooltip: '组件旋转角度（0-360度）',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.range(0, 360, '旋转角度必须在0-360度之间')
        ]
      },
      {
        type: 'slider',
        label: '透明度',
        key: 'opacity',
        min: 0,
        max: 1,
        step: 0.01,
        tooltip: '组件透明度（0-1）',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.range(0, 1, '透明度必须在0-1之间')
        ]
      }
    ];

    // 边框配置
    this.borderConfig = [
      {
        type: 'number',
        label: '边框宽度',
        key: 'borderWidth',
        min: 0,
        step: 1,
        tooltip: '边框宽度（像素）',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(0, '边框宽度不能小于0'),
          ValidationService.createRules.max(50, '边框宽度不能超过50像素')
        ]
      },
      {
        type: 'select',
        label: '边框样式',
        key: 'borderStyle',
        options: [
          { label: '无', value: 'none' },
          { label: '实线', value: 'solid' },
          { label: '虚线', value: 'dashed' },
          { label: '点线', value: 'dotted' },
          { label: '双线', value: 'double' }
        ],
        tooltip: '边框线条样式',
        realtimeValidation: true
      },
      {
        type: 'color',
        label: '边框颜色',
        key: 'borderColor',
        tooltip: '边框颜色',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.color('请输入有效的颜色值')
        ]
      },
      {
        type: 'number',
        label: '圆角半径',
        key: 'borderRadius',
        min: 0,
        step: 1,
        tooltip: '边框圆角半径（像素）',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(0, '圆角半径不能小于0'),
          ValidationService.createRules.max(500, '圆角半径不能超过500像素')
        ]
      }
    ];

    // 背景配置
    this.backgroundConfig = [
      {
        type: 'color',
        label: '背景颜色',
        key: 'backgroundColor',
        tooltip: '组件背景颜色',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.color('请输入有效的颜色值')
        ]
      },
      {
        type: 'input',
        label: '背景图片',
        key: 'backgroundImage',
        placeholder: 'url(...) 或图片URL',
        tooltip: '背景图片URL',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.url('请输入有效的图片URL地址'),
          ValidationService.createRules.maxLength(500, 'URL长度不能超过500个字符')
        ]
      }
    ];

    // 层级配置
    this.layerConfig = [
      {
        type: 'number',
        label: 'Z-Index',
        key: 'zIndex',
        min: 0,
        step: 1,
        tooltip: '组件层级，数值越大越靠前',
        realtimeValidation: true,
        validationRules: [
          ValidationService.createRules.min(0, 'Z-Index不能小于0'),
          ValidationService.createRules.max(9999, 'Z-Index不能超过9999')
        ]
      }
    ];
  }

  private buildFormData(): void {
    const style = this.component.style;

    // 处理背景图片，移除 url() 包装
    const backgroundImageValue = style.backgroundImage || '';
    const cleanBackgroundImage = backgroundImageValue.startsWith('url(') && backgroundImageValue.endsWith(')')
      ? backgroundImageValue.slice(4, -1).trim()
      : backgroundImageValue;

    this.formData = {
      position: {
        left: style.left || 0,
        top: style.top || 0
      },
      size: {
        width: style.width || 100,
        height: style.height || 100
      },
      transform: {
        rotate: style.rotate || 0,
        opacity: style.opacity ?? 1
      },
      border: {
        borderWidth: style.borderWidth ?? 0,
        borderStyle: style.borderStyle ?? 'none',
        borderColor: style.borderColor ?? '#000000',
        borderRadius: style.borderRadius ?? 0
      },
      background: {
        backgroundColor: style.backgroundColor || '',
        backgroundImage: cleanBackgroundImage
      },
      layer: {
        zIndex: style.zIndex ?? 1
      }
    };
  }

  private setupChangeHandler(): void {
    this.changeSubject$.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.applyStyleChange(event);
    });
  }

  onStyleChange(event: FormChangeEvent): void {
    this.changeSubject$.next(event);
  }

  // 分组处理方法
  onPositionChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0] as keyof ComponentStyle;
    const styleUpdates: Partial<ComponentStyle> = {};
    if (property === 'left' || property === 'top') {
      styleUpdates[property] = value;
      this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
    }
  }

  onSizeChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0] as keyof ComponentStyle;
    const styleUpdates: Partial<ComponentStyle> = {};
    if (property === 'width' || property === 'height') {
      styleUpdates[property] = value;
      this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
    }
  }

  onTransformChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0];
    const styleUpdates: Partial<ComponentStyle> = {};
    if (property === 'rotate') {
      styleUpdates.rotate = value;
    } else if (property === 'opacity') {
      styleUpdates.opacity = value;
    }
    this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
  }

  onBorderChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0] as keyof ComponentStyle;
    const styleUpdates: Partial<ComponentStyle> = {};
    styleUpdates[property] = value as any;
    this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
  }

  onBackgroundChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0];
    const styleUpdates: Partial<ComponentStyle> = {};
    if (property === 'backgroundColor') {
      styleUpdates.backgroundColor = value;
    } else if (property === 'backgroundImage') {
      styleUpdates.backgroundImage = value && !value.startsWith('url') ? `url(${value})` : value;
    }
    this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
  }

  onLayerChange(event: FormChangeEvent): void {
    const { keys, value } = event;
    const property = keys[0];
    const styleUpdates: Partial<ComponentStyle> = {};
    if (property === 'zIndex') {
      styleUpdates.zIndex = value;
    }
    this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
  }

  
  // 重置功能
  resetGroup(groupName: string): void {
    const defaultValues: { [key: string]: any } = {
      position: { left: 0, top: 0 },
      size: { width: 100, height: 100 },
      transform: { rotate: 0, opacity: 1 },
      border: { borderWidth: 0, borderStyle: 'none', borderColor: '#000000', borderRadius: 0 },
      background: { backgroundColor: '', backgroundImage: '' },
      layer: { zIndex: 1 }
    };

    const groupDefaults = defaultValues[groupName];
    if (!groupDefaults) return;

    const styleUpdates: Partial<ComponentStyle> = {};

    Object.entries(groupDefaults).forEach(([key, value]) => {
      if (groupName === 'position' || groupName === 'size') {
        // 直接使用数值，因为ComponentStyle中定义的是number类型
        if (key === 'left') styleUpdates.left = value as number;
        if (key === 'top') styleUpdates.top = value as number;
        if (key === 'width') styleUpdates.width = value as number;
        if (key === 'height') styleUpdates.height = value as number;
      } else if (groupName === 'transform') {
        if (key === 'rotate') styleUpdates.rotate = value as number;
        if (key === 'opacity') styleUpdates.opacity = value as number;
      } else if (groupName === 'border') {
        if (key === 'borderWidth') styleUpdates.borderWidth = value as number;
        if (key === 'borderStyle') styleUpdates.borderStyle = value as 'solid' | 'dashed' | 'dotted' | 'none';
        if (key === 'borderColor') styleUpdates.borderColor = value as string;
        if (key === 'borderRadius') styleUpdates.borderRadius = value as number;
      } else if (groupName === 'background') {
        if (key === 'backgroundColor') styleUpdates.backgroundColor = value as string;
        if (key === 'backgroundImage') styleUpdates.backgroundImage = value as string;
      } else if (groupName === 'layer') {
        styleUpdates.zIndex = value as number;
      }
    });

    if (Object.keys(styleUpdates).length > 0) {
      this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
      this.buildFormData(); // 重新构建表单数据
    }
  }

  private applyStyleChange(event: FormChangeEvent): void {
    const { keys, value } = event;

    const styleUpdates: Partial<ComponentStyle> = {};

    if (keys[0] === 'position') {
      if (keys[1] === 'left') styleUpdates.left = value;
      if (keys[1] === 'top') styleUpdates.top = value;
    } else if (keys[0] === 'size') {
      if (keys[1] === 'width') styleUpdates.width = value;
      if (keys[1] === 'height') styleUpdates.height = value;
    } else if (keys[0] === 'transform') {
      if (keys[1] === 'rotate') styleUpdates.rotate = value;
      if (keys[1] === 'opacity') styleUpdates.opacity = value;
    } else if (keys[0] === 'border') {
      if (keys[1] === 'borderWidth') styleUpdates.borderWidth = value;
      if (keys[1] === 'borderStyle') styleUpdates.borderStyle = value;
      if (keys[1] === 'borderColor') styleUpdates.borderColor = value;
      if (keys[1] === 'borderRadius') styleUpdates.borderRadius = value;
    } else if (keys[0] === 'background') {
      if (keys[1] === 'backgroundColor') styleUpdates.backgroundColor = value;
      if (keys[1] === 'backgroundImage') styleUpdates.backgroundImage = value;
    } else if (keys[0] === 'layer') {
      if (keys[1] === 'zIndex') styleUpdates.zIndex = value;
    }

    if (Object.keys(styleUpdates).length > 0) {
      this.canvasService.updateComponentStyle(this.component.id, styleUpdates);
    }
  }

  // 验证相关方法
  private setupValidation(): void {
    // 初始化验证结果
    this.validateAllFields();
  }

  onValidationChange(event: { keys: string[]; result: ValidationResult }): void {
    const fieldKey = event.keys.join('.');
    this.validationResults[fieldKey] = event.result;
    this.updateFormValidationStatus();
  }

  private updateFormValidationStatus(): void {
    this.isFormValid = this.validationService.isFormValid(this.validationResults);

    if (!this.isFormValid) {
      this.showValidationSummary = true;
    }
  }

  private validateAllFields(): void {
    const allConfigs = [
      ...this.positionConfig,
      ...this.sizeConfig,
      ...this.transformConfig,
      ...this.borderConfig,
      ...this.backgroundConfig,
      ...this.layerConfig
    ];

    this.validationResults = this.validationService.validateForm(this.formData, allConfigs);
    this.updateFormValidationStatus();
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    Object.entries(this.validationResults).forEach(([field, result]) => {
      if (!result.isValid && result.message) {
        errors.push(result.message);
      }
    });

    return errors;
  }

  // 公共验证方法
  public validateForm(): boolean {
    this.validateAllFields();

    // 强制显示所有表单项的验证错误
    if (this.formItems) {
      this.formItems.forEach(item => {
        if (!item.isValid()) {
          item.validate();
        }
      });
    }

    this.showValidationSummary = !this.isFormValid;
    return this.isFormValid;
  }

  public resetValidation(): void {
    this.validationResults = {};
    this.isFormValid = true;
    this.showValidationSummary = false;

    if (this.formItems) {
      this.formItems.forEach(item => {
        item.reset();
      });
    }
  }

  public isFormValidating(): boolean {
    return !this.isFormValid;
  }
}
