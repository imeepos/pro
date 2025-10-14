import { Component, Input, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ComponentItem } from '../models/component.model';
import { DataSlotterService } from '../data-slotter/data-slotter.service';
import { DataSlotterQuery } from '../data-slotter/data-slotter.query';
import { DataSourceType, DataMode } from '../models/data-source.enum';
import { DataSlot, DataPlugin } from '../models/data-source.model';

@Component({
  selector: 'app-data-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-module">
      @if (component) {
        <div class="data-type-selector">
          <label>数据源类型</label>
          <select
            [(ngModel)]="selectedDataType"
            name="selectedDataType"
            (ngModelChange)="onDataTypeChange()"
            class="form-control"
          >
            <option value="">请选择数据源类型</option>
            @for (plugin of availablePlugins; track plugin.type) {
              <option [value]="plugin.type">{{ plugin.name }}</option>
            }
          </select>
        </div>

        @if (selectedDataType && currentSlot) {
          <div class="data-config-container">
            <ng-container #configContainer></ng-container>
          </div>

          <div class="data-preview">
            <div class="preview-header">
              <h4>数据预览</h4>
              <button
                type="button"
                class="btn-refresh"
                (click)="refreshData()"
                [disabled]="isLoading"
              >
                {{ isLoading ? '加载中...' : '刷新' }}
              </button>
            </div>
            <div class="preview-content">
              @if (dataError) {
                <div class="error-message">
                  <strong>错误:</strong> {{ dataError }}
                </div>
              } @else if (previewData) {
                <pre>{{ previewData | json }}</pre>
              } @else {
                <div class="empty-message">暂无数据</div>
              }
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <p>请选择数据源类型</p>
          </div>
        }
      } @else {
        <div class="empty-state">
          <p>请先选择一个组件</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-module {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .data-type-selector {
      padding: 1rem;
      border-bottom: 1px solid #e8e8e8;
    }

    .data-type-selector label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #1890ff;
    }

    .data-config-container {
      flex: 1;
      overflow-y: auto;
      border-bottom: 1px solid #e8e8e8;
    }

    .data-preview {
      flex-shrink: 0;
      height: 300px;
      display: flex;
      flex-direction: column;
      border-top: 1px solid #e8e8e8;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background-color: #fafafa;
      border-bottom: 1px solid #e8e8e8;
    }

    .preview-header h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
    }

    .btn-refresh {
      padding: 0.25rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.3s;
    }

    .btn-refresh:hover:not(:disabled) {
      border-color: #1890ff;
      color: #1890ff;
    }

    .btn-refresh:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
      background-color: #f6f8fa;
    }

    .preview-content pre {
      margin: 0;
      padding: 0.5rem;
      background-color: #ffffff;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      font-size: 0.75rem;
      line-height: 1.5;
      overflow-x: auto;
    }

    .error-message {
      padding: 0.75rem;
      background-color: #fff2f0;
      border: 1px solid #ffccc7;
      border-radius: 4px;
      color: #cf1322;
      font-size: 0.875rem;
    }

    .empty-message {
      text-align: center;
      color: #999;
      font-size: 0.875rem;
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 0.875rem;
    }
  `]
})
export class DataModuleComponent implements OnInit, OnDestroy {
  @Input() component?: ComponentItem;
  @ViewChild('configContainer', { read: ViewContainerRef }) configContainer!: ViewContainerRef;

  availablePlugins: DataPlugin[] = [];
  selectedDataType: DataSourceType | '' = '';
  currentSlot?: DataSlot;
  previewData: any = null;
  dataError: string | null = null;
  isLoading = false;

  private configComponentRef?: ComponentRef<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private dataSlotterService: DataSlotterService,
    private dataSlotterQuery: DataSlotterQuery
  ) {}

  ngOnInit(): void {
    this.availablePlugins = this.dataSlotterService.getComponentPlugins();

    if (this.component) {
      this.loadComponentDataSlot();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyConfigComponent();
  }

  private loadComponentDataSlot(): void {
    if (!this.component) return;

    const slot = this.dataSlotterQuery.getSlotByComponentId(this.component.id);
    if (slot) {
      this.currentSlot = slot;
      this.selectedDataType = slot.dataConfig.type;
      this.loadConfigComponent();
      this.subscribeToSlotData();
    }
  }

  onDataTypeChange(): void {
    if (!this.component || !this.selectedDataType) return;

    const plugin = this.dataSlotterService.getPlugin(this.selectedDataType);
    if (!plugin) return;

    if (this.currentSlot) {
      const defaultConfig = plugin.getDefaultConfig?.() || {
        type: this.selectedDataType,
        mode: DataMode.SELF,
        options: {}
      };

      this.dataSlotterService.updateDataConfig(this.currentSlot.id, defaultConfig as any);
    } else {
      const defaultConfig = plugin.getDefaultConfig?.() || {
        type: this.selectedDataType,
        mode: DataMode.SELF,
        options: {}
      };

      const slotId = this.dataSlotterService.createDataSlot(this.component.id, defaultConfig as any);
      this.currentSlot = this.dataSlotterQuery.getEntity(slotId);
    }

    this.loadConfigComponent();
    this.subscribeToSlotData();
  }

  private loadConfigComponent(): void {
    this.destroyConfigComponent();

    if (!this.selectedDataType || !this.currentSlot) return;

    const plugin = this.dataSlotterService.getPlugin(this.selectedDataType);
    if (!plugin) return;

    setTimeout(() => {
      this.configContainer.clear();
      this.configComponentRef = this.configContainer.createComponent(plugin.component);
      this.configComponentRef.instance.slot = this.currentSlot;
    });
  }

  private destroyConfigComponent(): void {
    if (this.configComponentRef) {
      this.configComponentRef.destroy();
      this.configComponentRef = undefined;
    }
  }

  private subscribeToSlotData(): void {
    if (!this.currentSlot) return;

    this.currentSlot.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.isLoading = response.status === 'LOADING';

        if (response.status === 'SUCCESS') {
          this.previewData = response.data;
          this.dataError = null;
        } else if (response.status === 'ERROR') {
          this.dataError = response.error || '未知错误';
          this.previewData = null;
        }
      });
  }

  refreshData(): void {
    if (this.currentSlot) {
      this.isLoading = true;
      this.dataSlotterService.debugDataSource(this.currentSlot.id);
    }
  }
}
