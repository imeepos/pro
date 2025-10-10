import { Component, Input, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { FormMetadata, FormChangeEvent, ValidationResult } from '../../models/form-metadata.model';
import { FormContainerComponent } from '../form-controls/form-container.component';
import { FormItemComponent } from '../form-controls/form-item.component';
import { ValidationService } from '../../services/validation.service';
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

  // 验证相关
  validationResults: { [key: string]: ValidationResult } = {};
  isFormValid: boolean = true;
  showValidationSummary: boolean = false;

  @ViewChildren(FormItemComponent) formItems!: QueryList<FormItemComponent>;

  private destroy$ = new Subject<void>();
  private changeSubject$ = new Subject<FormChangeEvent>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private canvasService: CanvasService,
    private componentRegistry: ComponentRegistryService,
    private validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.buildAttrConfig();
    this.buildFormData();
    this.setupChangeHandler();
    this.setupSearchHandler();
    this.setupValidation();
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
            tooltip: '自定义组件名称',
            required: true,
            realtimeValidation: true,
            validationRules: [
              ValidationService.createRules.required('组件名称为必填项'),
              ValidationService.createRules.minLength(2, '组件名称至少需要2个字符'),
              ValidationService.createRules.maxLength(50, '组件名称不能超过50个字符'),
              ValidationService.createRules.pattern('^[a-zA-Z0-9_\\u4e00-\\u9fa5\\s-]+$', '组件名称只能包含字母、数字、下划线、中文、空格和连字符')
            ]
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
        tooltip: config.description,
        realtimeValidation: true
      };

      // 根据配置类型设置验证规则
      switch (config.type) {
        case 'string':
          formItem.type = config.multiline ? 'textarea' : 'input';
          formItem.placeholder = config.placeholder;
          formItem.validationRules = this.buildStringValidationRules(config);
          if (config.required) {
            formItem.required = true;
          }
          break;
        case 'number':
          formItem.type = 'number';
          formItem.min = config.min;
          formItem.max = config.max;
          formItem.step = config.step;
          formItem.validationRules = this.buildNumberValidationRules(config);
          if (config.required) {
            formItem.required = true;
          }
          break;
        case 'boolean':
          formItem.type = 'switch';
          break;
        case 'color':
          formItem.type = 'color';
          formItem.validationRules = [
            ValidationService.createRules.color('请输入有效的颜色值')
          ];
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
          formItem.validationRules = this.buildNumberValidationRules(config);
          break;
        case 'url':
          formItem.type = 'input';
          formItem.placeholder = config.placeholder || 'https://example.com';
          formItem.validationRules = [
            ValidationService.createRules.url('请输入有效的URL地址')
          ];
          if (config.required) {
            formItem.required = true;
          }
          break;
        case 'email':
          formItem.type = 'input';
          formItem.placeholder = config.placeholder || 'email@example.com';
          formItem.validationRules = [
            ValidationService.createRules.email('请输入有效的邮箱地址')
          ];
          if (config.required) {
            formItem.required = true;
          }
          break;
      }

      formItems.push(formItem);
    }

    return formItems;
  }

  private buildStringValidationRules(config: any): any[] {
    const rules: any[] = [];

    if (config.required) {
      rules.push(ValidationService.createRules.required(`${config.label || '此字段'}为必填项`));
    }

    if (config.minLength) {
      rules.push(ValidationService.createRules.minLength(config.minLength, `长度不能少于${config.minLength}个字符`));
    }

    if (config.maxLength) {
      rules.push(ValidationService.createRules.maxLength(config.maxLength, `长度不能超过${config.maxLength}个字符`));
    }

    if (config.pattern) {
      rules.push(ValidationService.createRules.pattern(config.pattern, config.patternMessage || '格式不正确'));
    }

    return rules;
  }

  private buildNumberValidationRules(config: any): any[] {
    const rules: any[] = [];

    if (config.required) {
      rules.push(ValidationService.createRules.required(`${config.label || '此字段'}为必填项`));
    }

    if (config.min !== undefined) {
      rules.push(ValidationService.createRules.min(config.min, `值不能小于${config.min}`));
    }

    if (config.max !== undefined) {
      rules.push(ValidationService.createRules.max(config.max, `值不能大于${config.max}`));
    }

    if (config.min !== undefined && config.max !== undefined) {
      rules.push(ValidationService.createRules.range(config.min, config.max, `值必须在${config.min}到${config.max}之间`));
    }

    return rules;
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
    this.validationResults = this.validationService.validateForm(this.formData, this.attrConfig);
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
