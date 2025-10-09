import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ComponentItem, ComponentStyle } from '../../models/component.model';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormContainerComponent } from '../form-controls/form-container.component';
import { CanvasService } from '../../canvas/services/canvas.service';

@Component({
  selector: 'app-style-editor',
  standalone: true,
  imports: [CommonModule, FormContainerComponent],
  template: `
    <div class="style-editor p-4 overflow-y-auto">
      <app-form-container
        [config]="styleConfig"
        [formData]="formData"
        (change)="onStyleChange($event)"
      />
    </div>
  `
})
export class StyleEditorComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;

  formData: any = {};
  styleConfig: FormMetadata[] = [];

  private destroy$ = new Subject<void>();
  private changeSubject$ = new Subject<FormChangeEvent>();

  constructor(private canvasService: CanvasService) {}

  ngOnInit(): void {
    this.buildStyleConfig();
    this.buildFormData();
    this.setupChangeHandler();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildStyleConfig(): void {
    this.styleConfig = [
      {
        type: 'group',
        label: '位置',
        key: 'position',
        children: [
          {
            type: 'number',
            label: 'X坐标',
            key: ['position', 'left'],
            min: 0,
            step: 1,
            tooltip: '组件在画布上的X坐标'
          },
          {
            type: 'number',
            label: 'Y坐标',
            key: ['position', 'top'],
            min: 0,
            step: 1,
            tooltip: '组件在画布上的Y坐标'
          }
        ]
      },
      {
        type: 'group',
        label: '尺寸',
        key: 'size',
        children: [
          {
            type: 'number',
            label: '宽度',
            key: ['size', 'width'],
            min: 1,
            step: 1,
            tooltip: '组件宽度'
          },
          {
            type: 'number',
            label: '高度',
            key: ['size', 'height'],
            min: 1,
            step: 1,
            tooltip: '组件高度'
          }
        ]
      },
      {
        type: 'group',
        label: '变换',
        key: 'transform',
        children: [
          {
            type: 'slider',
            label: '旋转角度',
            key: ['transform', 'rotate'],
            min: 0,
            max: 360,
            step: 1,
            tooltip: '组件旋转角度（0-360度）'
          },
          {
            type: 'slider',
            label: '透明度',
            key: ['transform', 'opacity'],
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: '组件透明度（0-1）'
          }
        ]
      },
      {
        type: 'group',
        label: '边框',
        key: 'border',
        children: [
          {
            type: 'number',
            label: '边框宽度',
            key: ['border', 'borderWidth'],
            min: 0,
            step: 1,
            tooltip: '边框宽度（像素）'
          },
          {
            type: 'select',
            label: '边框样式',
            key: ['border', 'borderStyle'],
            options: [
              { label: '无', value: 'none' },
              { label: '实线', value: 'solid' },
              { label: '虚线', value: 'dashed' },
              { label: '点线', value: 'dotted' }
            ],
            tooltip: '边框线条样式'
          },
          {
            type: 'color',
            label: '边框颜色',
            key: ['border', 'borderColor'],
            tooltip: '边框颜色'
          },
          {
            type: 'number',
            label: '圆角',
            key: ['border', 'borderRadius'],
            min: 0,
            step: 1,
            tooltip: '边框圆角半径（像素）'
          }
        ]
      },
      {
        type: 'group',
        label: '背景',
        key: 'background',
        children: [
          {
            type: 'color',
            label: '背景颜色',
            key: ['background', 'backgroundColor'],
            tooltip: '组件背景颜色'
          },
          {
            type: 'input',
            label: '背景图片',
            key: ['background', 'backgroundImage'],
            placeholder: 'url(...) 或图片URL',
            tooltip: '背景图片URL'
          }
        ]
      },
      {
        type: 'group',
        label: '层级',
        key: 'layer',
        children: [
          {
            type: 'number',
            label: 'Z-Index',
            key: ['layer', 'zIndex'],
            min: 0,
            step: 1,
            tooltip: '组件层级，数值越大越靠前'
          }
        ]
      }
    ];
  }

  private buildFormData(): void {
    const style = this.component.style;
    this.formData = {
      position: {
        left: style.left,
        top: style.top
      },
      size: {
        width: style.width,
        height: style.height
      },
      transform: {
        rotate: style.rotate,
        opacity: style.opacity ?? 1
      },
      border: {
        borderWidth: style.borderWidth ?? 0,
        borderStyle: style.borderStyle ?? 'none',
        borderColor: style.borderColor ?? '#000000',
        borderRadius: style.borderRadius ?? 0
      },
      background: {
        backgroundColor: style.backgroundColor ?? '',
        backgroundImage: style.backgroundImage ?? ''
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
}
