import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormContainerComponent } from '../form-controls/form-container.component';
import { CanvasService } from '../../canvas/services/canvas.service';
import { ComponentRegistryService } from '../../../../../core/services/component-registry.service';

@Component({
  selector: 'app-attr-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FormContainerComponent],
  templateUrl: './attr-editor.component.html',
  styleUrls: ['./attr-editor.component.scss']
})
export class AttrEditorComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;

  formData: any = {};
  attrConfig: FormMetadata[] = [];
  filteredAttrConfig: FormMetadata[] = [];
  searchTerm: string = '';
  basicSectionCollapsed: boolean = false;
  advancedSectionCollapsed: boolean = true;

  private destroy$ = new Subject<void>();
  private changeSubject$ = new Subject<FormChangeEvent>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private canvasService: CanvasService,
    private componentRegistry: ComponentRegistryService
  ) {}

  ngOnInit(): void {
    this.buildAttrConfig();
    this.buildFormData();
    this.setupChangeHandler();
    this.setupSearchHandler();
    this.filteredAttrConfig = [...this.attrConfig];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildAttrConfig(): void {
    const componentMeta = this.componentRegistry.get(this.component.type);

    this.attrConfig = [
      {
        type: 'group',
        label: '基础属性',
        key: 'common',
        children: [
          {
            type: 'input',
            label: '组件ID',
            key: ['common', 'id'],
            disabled: true,
            tooltip: '组件唯一标识符'
          },
          {
            type: 'input',
            label: '组件类型',
            key: ['common', 'type'],
            disabled: true,
            tooltip: '组件类型名称'
          },
          {
            type: 'input',
            label: '组件名称',
            key: ['common', 'name'],
            placeholder: '输入组件名称',
            tooltip: '自定义组件名称'
          }
        ]
      }
    ];

    const configSchema = (componentMeta as any)?.metadata?.configSchema;
    if (configSchema) {
      this.attrConfig.push({
        type: 'group',
        label: '组件配置',
        key: 'config',
        children: this.buildConfigSchema(configSchema)
      });
    }
  }

  private buildConfigSchema(schema: any): FormMetadata[] {
    const formItems: FormMetadata[] = [];

    for (const [key, value] of Object.entries(schema)) {
      const config = value as any;

      let formType: FormMetadata['type'] = 'input';
      const formItem: FormMetadata = {
        type: formType,
        label: config.label || key,
        key: ['config', key],
        tooltip: config.description
      };

      switch (config.type) {
        case 'string':
          formItem.type = config.multiline ? 'textarea' : 'input';
          formItem.placeholder = config.placeholder;
          break;
        case 'number':
          formItem.type = 'number';
          formItem.min = config.min;
          formItem.max = config.max;
          formItem.step = config.step;
          break;
        case 'boolean':
          formItem.type = 'switch';
          break;
        case 'color':
          formItem.type = 'color';
          break;
        case 'select':
          formItem.type = 'select';
          formItem.options = config.options;
          break;
        case 'slider':
          formItem.type = 'slider';
          formItem.min = config.min;
          formItem.max = config.max;
          formItem.step = config.step;
          break;
      }

      formItems.push(formItem);
    }

    return formItems;
  }

  private buildFormData(): void {
    this.formData = {
      common: {
        id: this.component.id,
        type: this.component.type,
        name: this.component.config?.['name'] || this.component.type
      },
      config: { ...this.component.config }
    };
  }

  private setupChangeHandler(): void {
    this.changeSubject$.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.applyAttrChange(event);
    });
  }

  onAttrChange(event: FormChangeEvent): void {
    this.changeSubject$.next(event);
  }

  // 组件名称变化处理
  onNameChange(newValue: string): void {
    this.changeSubject$.next({
      keys: ['common', 'name'],
      value: newValue
    });
  }

  private applyAttrChange(event: FormChangeEvent): void {
    const { keys, value } = event;

    if (keys[0] === 'common' && keys[1] === 'name') {
      this.canvasService.updateComponent(this.component.id, {
        config: {
          ...this.component.config,
          name: value
        }
      });
    } else if (keys[0] === 'config') {
      const configKey = keys[1];
      this.canvasService.updateComponent(this.component.id, {
        config: {
          ...this.component.config,
          [configKey]: value
        }
      });
    }
  }

  // 搜索相关方法
  private setupSearchHandler(): void {
    this.searchSubject$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filterAttrConfig(searchTerm);
    });
  }

  onSearchChange(event: any): void {
    const searchTerm = event.target.value;
    this.searchSubject$.next(searchTerm);
  }

  private filterAttrConfig(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredAttrConfig = [...this.attrConfig];
      return;
    }

    const term = searchTerm.toLowerCase().trim();

    this.filteredAttrConfig = this.attrConfig.filter(config => {
      if (config.type === 'group' && config.children) {
        const matchingChildren = config.children.filter(child =>
          this.matchesSearch(child, term)
        );
        return matchingChildren.length > 0;
      }
      return this.matchesSearch(config, term);
    });
  }

  private matchesSearch(metadata: FormMetadata, searchTerm: string): boolean {
    const labelMatch = metadata.label?.toLowerCase().includes(searchTerm);
    const tooltipMatch = metadata.tooltip?.toLowerCase().includes(searchTerm);
    const keyMatch = Array.isArray(metadata.key)
      ? metadata.key.join('.').toLowerCase().includes(searchTerm)
      : metadata.key?.toString().toLowerCase().includes(searchTerm);

    return labelMatch || tooltipMatch || keyMatch;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredAttrConfig = [...this.attrConfig];
  }

  getFilteredConfigLength(): number {
    let count = 0;
    this.filteredAttrConfig.forEach(config => {
      if (config.type === 'group' && config.children) {
        count += config.children.length;
      } else {
        count++;
      }
    });
    return count;
  }

  // 折叠区域相关方法
  toggleBasicSection(): void {
    this.basicSectionCollapsed = !this.basicSectionCollapsed;
  }

  toggleAdvancedSection(): void {
    this.advancedSectionCollapsed = !this.advancedSectionCollapsed;
  }

  getBasicConfig(): FormMetadata[] {
    return this.filteredAttrConfig.filter(config => config.key === 'common');
  }

  getAdvancedConfig(): FormMetadata[] {
    return this.filteredAttrConfig.filter(config => config.key === 'config');
  }

  hasAdvancedProperties(): boolean {
    return this.filteredAttrConfig.some(config => config.key === 'config');
  }

  getBasicPropertiesCount(): number {
    const basicConfig = this.getBasicConfig();
    let count = 0;
    basicConfig.forEach(config => {
      if (config.type === 'group' && config.children) {
        count += config.children.length;
      } else {
        count++;
      }
    });
    return count;
  }

  getAdvancedPropertiesCount(): number {
    const advancedConfig = this.getAdvancedConfig();
    let count = 0;
    advancedConfig.forEach(config => {
      if (config.type === 'group' && config.children) {
        count += config.children.length;
      } else {
        count++;
      }
    });
    return count;
  }

  // 复制功能
  copyToClipboard(text: string, event?: MouseEvent): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      // 添加复制成功的视觉反馈
      if (event && event.target) {
        const button = event.target as HTMLElement;
        const originalClass = button.className;

        // 添加成功状态样式
        button.classList.add('copied');
        button.style.color = '#10b981'; // green-500

        // 显示成功图标
        const originalSVG = button.innerHTML;
        button.innerHTML = `
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        `;

        // 0.5秒后恢复原状
        setTimeout(() => {
          button.classList.remove('copied');
          button.style.color = '';
          button.innerHTML = originalSVG;
        }, 500);
      }
    }).catch(err => {
      console.error('复制失败:', err);

      // 显示错误反馈
      if (event && event.target) {
        const button = event.target as HTMLElement;
        button.style.color = '#ef4444'; // red-500

        setTimeout(() => {
          button.style.color = '';
        }, 1000);
      }
    });
  }
}
