import { Component, Input, Output, EventEmitter, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormField, ComponentBase } from '../interfaces/component-base.interface';

export interface FormConfig {
  fields: FormField[];
  layout?: 'vertical' | 'horizontal' | 'grid';
  gridColumns?: number;
  submitText?: string;
  resetText?: string;
  showSubmit?: boolean;
  showReset?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

@Component({
  selector: 'pro-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" [class]="formClasses" (ngSubmit)="handleSubmit($event)">
      <!-- Form Header -->
      <div *ngIf="title || description" class="form-header">
        <h2 *ngIf="title" class="form-title">{{ title }}</h2>
        <p *ngIf="description" class="form-description">{{ description }}</p>
      </div>

      <!-- Form Fields Container -->
      <div [class]="fieldsContainerClasses">
        <div
          *ngFor="let field of visibleFields; let i = index"
          [class]="getFieldContainerClasses(field, i)"
          [ngSwitch]="field.type">

          <!-- Label -->
          <label
            *ngIf="field.label && layout !== 'inline'"
            [for]="field.name"
            [class]="labelClasses">
            {{ field.label }}
            <span *ngIf="field.required" class="required-asterisk">*</span>
          </label>

          <!-- Text Input -->
          <pro-input
            *ngSwitchCase="'text'"
            [id]="field.name"
            [name]="field.name"
            [formControlName]="field.name"
            [placeholder]="field.placeholder"
            [required]="field.required"
            [disabled]="isFieldDisabled(field)"
            [helpText]="getFieldHelp(field)"
            [errorMessage]="getFieldError(field)"
            [hasError]="isFieldInvalid(field)"
            [size]="size"
            [color]="color">
          </pro-input>

          <!-- Password Input -->
          <pro-input
            *ngSwitchCase="'password'"
            [id]="field.name"
            [name]="field.name"
            [type]="'password'"
            [formControlName]="field.name"
            [placeholder]="field.placeholder"
            [required]="field.required"
            [disabled]="isFieldDisabled(field)"
            [helpText]="getFieldHelp(field)"
            [errorMessage]="getFieldError(field)"
            [hasError]="isFieldInvalid(field)"
            [size]="size"
            [color]="color">
          </pro-input>

          <!-- Email Input -->
          <pro-input
            *ngSwitchCase="'email'"
            [id]="field.name"
            [name]="field.name"
            [type]="'email'"
            [formControlName]="field.name"
            [placeholder]="field.placeholder"
            [required]="field.required"
            [disabled]="isFieldDisabled(field)"
            [helpText]="getFieldHelp(field)"
            [errorMessage]="getFieldError(field)"
            [hasError]="isFieldInvalid(field)"
            [size]="size"
            [color]="color">
          </pro-input>

          <!-- Number Input -->
          <pro-input
            *ngSwitchCase="'number'"
            [id]="field.name"
            [name]="field.name"
            [type]="'number'"
            [formControlName]="field.name"
            [placeholder]="field.placeholder"
            [required]="field.required"
            [disabled]="isFieldDisabled(field)"
            [helpText]="getFieldHelp(field)"
            [errorMessage]="getFieldError(field)"
            [hasError]="isFieldInvalid(field)"
            [size]="size"
            [color]="color">
          </pro-input>

          <!-- Select Dropdown -->
          <div *ngSwitchCase="'select'" class="select-container">
            <select
              [id]="field.name"
              [formControlName]="field.name"
              [class]="getSelectClasses(field)"
              [disabled]="isFieldDisabled(field)"
              [required]="field.required">
              <option value="" *ngIf="!field.required">{{ field.placeholder || '请选择...' }}</option>
              <option
                *ngFor="let option of field.options"
                [value]="option.value">
                {{ option.label }}
              </option>
            </select>
            <div *ngIf="getFieldHelp(field)" class="field-help-text">{{ getFieldHelp(field) }}</div>
            <div *ngIf="isFieldInvalid(field)" class="field-error-text">{{ getFieldError(field) }}</div>
          </div>

          <!-- Textarea -->
          <div *ngSwitchCase="'textarea'" class="textarea-container">
            <textarea
              [id]="field.name"
              [formControlName]="field.name"
              [placeholder]="field.placeholder"
              [disabled]="isFieldDisabled(field)"
              [required]="field.required"
              [class]="getTextareaClasses(field)"
              rows="4">
            </textarea>
            <div *ngIf="getFieldHelp(field)" class="field-help-text">{{ getFieldHelp(field) }}</div>
            <div *ngIf="isFieldInvalid(field)" class="field-error-text">{{ getFieldError(field) }}</div>
          </div>

          <!-- Checkbox -->
          <div *ngSwitchCase="'checkbox'" class="checkbox-container">
            <label class="checkbox-label">
              <input
                [id]="field.name"
                type="checkbox"
                [formControlName]="field.name"
                [disabled]="isFieldDisabled(field)"
                class="checkbox-input">
              <span class="checkbox-text">{{ field.label }}</span>
            </label>
            <div *ngIf="getFieldHelp(field)" class="field-help-text">{{ getFieldHelp(field) }}</div>
            <div *ngIf="isFieldInvalid(field)" class="field-error-text">{{ getFieldError(field) }}</div>
          </div>

          <!-- Radio Group -->
          <div *ngSwitchCase="'radio'" class="radio-container">
            <div class="radio-label">{{ field.label }}</div>
            <div
              *ngFor="let option of field.options"
              class="radio-option">
              <label class="radio-label-item">
                <input
                  [id]="field.name + '_' + option.value"
                  type="radio"
                  [name]="field.name"
                  [formControlName]="field.name"
                  [value]="option.value"
                  [disabled]="isFieldDisabled(field)"
                  class="radio-input">
                <span class="radio-text">{{ option.label }}</span>
              </label>
            </div>
            <div *ngIf="getFieldHelp(field)" class="field-help-text">{{ getFieldHelp(field) }}</div>
            <div *ngIf="isFieldInvalid(field)" class="field-error-text">{{ getFieldError(field) }}</div>
          </div>

          <!-- Inline Label for horizontal layout -->
          <label
            *ngIf="field.label && layout === 'horizontal'"
            [for]="field.name"
            [class]="inlineLabelClasses">
            {{ field.label }}
            <span *ngIf="field.required" class="required-asterisk">*</span>
          </label>
        </div>
      </div>

      <!-- Form Actions -->
      <div *ngIf="showSubmit || showReset || customActions" class="form-actions">
        <!-- Default Actions -->
        <div class="default-actions">
          <pro-button
            *ngIf="showReset"
            type="button"
            [label]="resetText || '重置'"
            [color]="'secondary'"
            [size]="size"
            [disabled]="disabled || loading"
            (clicked)="handleReset()">
          </pro-button>

          <pro-button
            *ngIf="showSubmit"
            type="submit"
            [label]="submitText || '提交'"
            [color]="color"
            [size]="size"
            [disabled]="disabled || !form.valid"
            [loading]="loading">
          </pro-button>
        </div>

        <!-- Custom Actions -->
        <div class="custom-actions">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>

      <!-- Form Footer -->
      <div *ngIf="footerText" class="form-footer">
        <p class="footer-text">{{ footerText }}</p>
      </div>
    </form>
  `,
  styles: [`
    .form-container {
      @apply space-y-6;
    }

    .form-header {
      @apply mb-6;
    }

    .form-title {
      @apply text-lg font-semibold text-gray-900 dark:text-white mb-2;
    }

    .form-description {
      @apply text-sm text-gray-600 dark:text-gray-400;
    }

    .fields-container-vertical {
      @apply space-y-6;
    }

    .fields-container-horizontal {
      @apply space-y-4;
    }

    .fields-container-grid {
      @apply grid gap-6;
    }

    .field-container {
      @apply space-y-1;
    }

    .field-label {
      @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1;
    }

    .inline-label {
      @apply block text-sm font-medium text-gray-700 dark:text-gray-300 pr-4;
    }

    .required-asterisk {
      @apply text-red-500 ml-1;
    }

    .field-help-text {
      @apply text-xs text-gray-500 dark:text-gray-400 mt-1;
    }

    .field-error-text {
      @apply text-xs text-red-600 dark:text-red-400 mt-1;
    }

    .select-container,
    .textarea-container {
      @apply space-y-1;
    }

    .select-input {
      @apply block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
    }

    .textarea-input {
      @apply block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
    }

    .checkbox-container {
      @apply space-y-1;
    }

    .checkbox-label {
      @apply flex items-center space-x-2 cursor-pointer;
    }

    .checkbox-input {
      @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
    }

    .checkbox-text {
      @apply text-sm text-gray-700 dark:text-gray-300;
    }

    .radio-container {
      @apply space-y-2;
    }

    .radio-label {
      @apply text-sm font-medium text-gray-700 dark:text-gray-300 mb-2;
    }

    .radio-option {
      @apply flex items-center;
    }

    .radio-label-item {
      @apply flex items-center space-x-2 cursor-pointer mr-4;
    }

    .radio-input {
      @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300;
    }

    .radio-text {
      @apply text-sm text-gray-700 dark:text-gray-300;
    }

    .form-actions {
      @apply flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700;
    }

    .default-actions {
      @apply flex space-x-3;
    }

    .custom-actions {
      @apply flex space-x-3;
    }

    .form-footer {
      @apply mt-6 pt-4 border-t border-gray-200 dark:border-gray-700;
    }

    .footer-text {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }

    /* Disabled state */
    .form-disabled {
      @apply opacity-60 pointer-events-none;
    }

    /* Grid columns */
    .grid-cols-1 { @apply grid-cols-1; }
    .grid-cols-2 { @apply grid-cols-2; }
    .grid-cols-3 { @apply grid-cols-3; }
    .grid-cols-4 { @apply grid-cols-4; }
  `]
})
export class FormComponent implements AfterContentInit, ComponentBase {
  @Input() config: FormConfig | FormField[] = [];
  @Input() title = '';
  @Input() description = '';
  @Input() footerText = '';
  @Input() layout: 'vertical' | 'horizontal' | 'grid' = 'vertical';
  @Input() gridColumns = 1;
  @Input() submitText = '';
  @Input() resetText = '';
  @Input() showSubmit = true;
  @Input() showReset = false;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' = 'primary';

  @Output() submit = new EventEmitter<any>();
  @Output() reset = new EventEmitter<void>();
  @Output() fieldChange = new EventEmitter<{ name: string; value: any; field: FormField }>();

  @ContentChildren('actions') customActions!: QueryList<any>;

  form: FormGroup;
  fields: FormField[] = [];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({});
  }

  ngAfterContentInit(): void {
    this.initializeForm();
  }

  ngOnChanges(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    // Parse config
    if (Array.isArray(this.config)) {
      this.fields = this.config;
    } else if (this.config.fields) {
      this.fields = this.config.fields;
    }

    // Apply config overrides
    if (!Array.isArray(this.config)) {
      const formConfig = this.config as FormConfig;
      this.layout = formConfig.layout || this.layout;
      this.gridColumns = formConfig.gridColumns || this.gridColumns;
      this.submitText = formConfig.submitText || this.submitText;
      this.resetText = formConfig.resetText || this.resetText;
      this.showSubmit = formConfig.showSubmit !== undefined ? formConfig.showSubmit : this.showSubmit;
      this.showReset = formConfig.showReset !== undefined ? formConfig.showReset : this.showReset;
      this.disabled = formConfig.disabled !== undefined ? formConfig.disabled : this.disabled;
      this.loading = formConfig.loading !== undefined ? formConfig.loading : this.loading;
    }

    // Build form controls
    const formControls: { [key: string]: any } = {};
    this.fields.forEach(field => {
      const validators = [];
      if (field.required) validators.push(Validators.required);
      if (field.validation?.min) validators.push(Validators.min(field.validation.min));
      if (field.validation?.max) validators.push(Validators.max(field.validation.max));
      if (field.validation?.pattern) validators.push(Validators.pattern(field.validation.pattern));

      formControls[field.name] = [null, validators];
    });

    this.form = this.fb.group(formControls);

    // Listen for value changes
    this.form.valueChanges.subscribe(values => {
      Object.keys(values).forEach(name => {
        const field = this.fields.find(f => f.name === name);
        if (field) {
          this.fieldChange.emit({ name, value: values[name], field });
        }
      });
    });
  }

  get visibleFields(): FormField[] {
    return this.fields;
  }

  get formClasses(): string {
    const baseClasses = 'form-container';
    const disabledClass = this.disabled ? 'form-disabled' : '';
    return `${baseClasses} ${disabledClass}`;
  }

  get fieldsContainerClasses(): string {
    const baseClasses = 'fields-container';
    const layoutClass = `fields-container-${this.layout}`;
    const gridClass = this.layout === 'grid' ? `grid-cols-${this.gridColumns}` : '';
    return `${baseClasses} ${layoutClass} ${gridClass}`;
  }

  getFieldContainerClasses(_field: FormField, _index: number): string {
    const baseClasses = 'field-container';
    return baseClasses;
  }

  get labelClasses(): string {
    return 'field-label';
  }

  get inlineLabelClasses(): string {
    const widthClasses = {
      horizontal: 'w-48',
      vertical: '',
      grid: ''
    };
    return `inline-label ${widthClasses[this.layout]}`;
  }

  getSelectClasses(_field: FormField): string {
    return 'select-input';
  }

  getTextareaClasses(_field: FormField): string {
    return 'textarea-input';
  }

  isFieldDisabled(field: FormField): boolean {
    return this.disabled || this.form.get(field.name)?.disabled || false;
  }

  isFieldInvalid(field: FormField): boolean {
    const control = this.form.get(field.name);
    return control?.invalid && (control?.dirty || control?.touched) || false;
  }

  getFieldError(field: FormField): string {
    const control = this.form.get(field.name);
    if (!control?.errors) return '';

    const errors = control.errors;
    if (errors['required']) return '此字段为必填项';
    if (errors['min']) return `最小值为 ${errors['min'].min}`;
    if (errors['max']) return `最大值为 ${errors['max'].max}`;
    if (errors['pattern']) return field.validation?.message || '格式不正确';
    if (errors['email']) return '邮箱格式不正确';

    return '输入不正确';
  }

  getFieldHelp(_field: FormField): string {
    return '';
  }

  handleSubmit(event: Event): void {
    event.preventDefault();

    if (this.form.valid && !this.disabled && !this.loading) {
      this.submit.emit(this.form.value);
    }
  }

  handleReset(): void {
    this.form.reset();
    this.reset.emit();
  }

  // Public methods for external control
  setValue(name: string, value: any): void {
    this.form.get(name)?.setValue(value);
  }

  getValue(name: string): any {
    return this.form.get(name)?.value;
  }

  patchValue(values: { [key: string]: any }): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    this.form.reset();
  }

  validateForm(): boolean {
    this.form.markAllAsTouched();
    return this.form.valid;
  }
}