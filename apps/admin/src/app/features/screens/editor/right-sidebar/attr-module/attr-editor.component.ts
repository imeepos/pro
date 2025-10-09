import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormContainerComponent } from '../form-controls/form-container.component';
import { CanvasService } from '../../canvas/services/canvas.service';
import { ComponentRegistryService } from '../../../../../core/services/component-registry.service';

@Component({
  selector: 'app-attr-editor',
  standalone: true,
  imports: [CommonModule, FormContainerComponent],
  template: `
    <div class="attr-editor p-4 overflow-y-auto">
      <app-form-container
        [config]="attrConfig"
        [formData]="formData"
        (change)="onAttrChange($event)"
      />
    </div>
  `
})
export class AttrEditorComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;

  formData: any = {};
  attrConfig: FormMetadata[] = [];

  private destroy$ = new Subject<void>();
  private changeSubject$ = new Subject<FormChangeEvent>();

  constructor(
    private canvasService: CanvasService,
    private componentRegistry: ComponentRegistryService
  ) {}

  ngOnInit(): void {
    this.buildAttrConfig();
    this.buildFormData();
    this.setupChangeHandler();
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
}
