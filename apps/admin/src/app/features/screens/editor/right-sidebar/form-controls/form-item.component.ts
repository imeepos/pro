import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormMetadata, ValidationResult, ValidationStatus } from '../../models/form-metadata.model';
import { ValidationService } from '../../services/validation.service';

@Component({
  selector: 'app-form-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-item mb-4" *ngIf="!metadata.showIf || metadata.showIf(formData)">
      <div class="flex items-center mb-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
          {{ metadata.label }}
          <span *ngIf="metadata.required" class="ml-1 text-red-500">*</span>
        </label>
        <div class="flex items-center ml-auto">
          <!-- 验证状态指示器 -->
          <span
            *ngIf="showValidation && isDirty && metadata.validationRules && metadata.validationRules.length > 0"
            class="mr-2 flex items-center"
            [class]="getValidationStatusClass()"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path *ngIf="validationResult.status === 'valid'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              <path *ngIf="validationResult.status === 'invalid'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span
            *ngIf="metadata.tooltip"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors duration-200"
            [title]="metadata.tooltip"
          >
            <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Input -->
      <input
        *ngIf="metadata.type === 'input'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        (blur)="onInputBlur()"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        [class]="getInputClasses()"
      />

      <!-- Number -->
      <input
        *ngIf="metadata.type === 'number'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        (blur)="onInputBlur()"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        type="number"
        [min]="metadata.min || 0"
        [max]="metadata.max || 100"
        [step]="metadata.step || 1"
        [class]="getInputClasses()"
      />

      <!-- Textarea -->
      <textarea
        *ngIf="metadata.type === 'textarea'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        (blur)="onInputBlur()"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        rows="3"
        [class]="getInputClasses()"
      ></textarea>

      <!-- Select -->
      <select
        *ngIf="metadata.type === 'select'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onSelectChange($event)"
        (blur)="onInputBlur()"
        [disabled]="!!metadata.disabled"
        [class]="getInputClasses()"
      >
        <option *ngFor="let option of metadata.options" [value]="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Switch -->
      <label *ngIf="metadata.type === 'switch'" class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          [(ngModel)]="currentValue"
          (ngModelChange)="onSwitchChange($event)"
          [disabled]="!!metadata.disabled"
          class="sr-only peer"
        />
        <div class="relative inline-flex items-center h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 w-11 bg-gray-200 peer-focus:ring-blue-500 dark:bg-gray-700 peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <div class="inline-block bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out pointer-events-none w-5 h-5 translate-x-0.5 peer-checked:translate-x-5"></div>
        </div>
      </label>

      <!-- Color -->
      <div *ngIf="metadata.type === 'color'" class="flex items-center gap-2">
        <input
          type="color"
          [(ngModel)]="currentValue"
          (ngModelChange)="onInputChange($event)"
          (blur)="onInputBlur()"
          [disabled]="!!metadata.disabled"
          class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer disabled:opacity-50"
          [class]="getInputClasses(false)"
        />
        <input
          type="text"
          [(ngModel)]="currentValue"
          (ngModelChange)="onInputChange($event)"
          (blur)="onInputBlur()"
          [disabled]="!!metadata.disabled"
          [placeholder]="'#000000'"
          [class]="getInputClasses(true)"
        />
      </div>

      <!-- Slider -->
      <div *ngIf="metadata.type === 'slider'" class="flex items-center gap-3">
        <input
          type="range"
          [(ngModel)]="currentValue"
          (ngModelChange)="onInputChange($event)"
          (blur)="onInputBlur()"
          [min]="metadata.min || 0"
          [max]="metadata.max || 100"
          [step]="metadata.step || 1"
          [disabled]="!!metadata.disabled"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right min-w-[3rem] text-center px-2 py-1 rounded border"
              [class]="getSliderValueClasses()">
          {{ currentValue }}
        </span>
      </div>

      <!-- 验证错误提示 -->
      <div
        *ngIf="showValidationError && !validationResult.isValid && validationResult.message"
        class="mt-2 p-2 rounded-lg text-sm flex items-center"
        [class]="getValidationErrorClass()"
      >
        <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        {{ validationResult.message }}
      </div>
    </div>
  `
})
export class FormItemComponent implements OnInit, OnChanges {
  @Input() metadata!: FormMetadata;
  @Input() formData: any = {};
  @Input() showValidation: boolean = true;
  @Output() valueChange = new EventEmitter<{ keys: string[]; value: any }>();
  @Output() validationChange = new EventEmitter<{ keys: string[]; result: ValidationResult }>();

  currentValue: any;
  validationResult: ValidationResult = { status: 'valid', isValid: true };
  isDirty: boolean = false;
  showValidationError: boolean = false;

  constructor(private validationService: ValidationService) {}

  ngOnInit(): void {
    this.updateCurrentValue();
    this.initializeValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metadata'] || changes['formData']) {
      this.updateCurrentValue();
      this.initializeValidation();
    }
  }

  private updateCurrentValue(): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.currentValue = this.getNestedValue(this.formData, keys);
  }

  private getNestedValue(obj: any, keys: string[]): any {
    return keys.reduce((acc, key) => acc?.[key], obj);
  }

  private initializeValidation(): void {
    if (this.metadata.validationRules && this.metadata.validationRules.length > 0) {
      this.validateValue();
    }
  }

  onInputChange(value: any): void {
    this.isDirty = true;

    // 处理值变化，根据类型进行适当转换
    const processedValue = this.metadata.type === 'number' ? parseFloat(value) : value;
    this.currentValue = processedValue;

    // 实时验证
    if (this.showValidation && this.shouldValidateRealtime()) {
      this.validateValue();
    }

    this.emitChange(processedValue);
  }

  onSelectChange(value: any): void {
    this.isDirty = true;

    // 下拉选择处理
    this.currentValue = value;

    // 实时验证
    if (this.showValidation && this.shouldValidateRealtime()) {
      this.validateValue();
    }

    this.emitChange(value);
  }

  onSwitchChange(value: boolean): void {
    this.isDirty = true;

    // 开关处理
    this.currentValue = value;

    // 实时验证
    if (this.showValidation && this.shouldValidateRealtime()) {
      this.validateValue();
    }

    this.emitChange(value);
  }

  onInputBlur(): void {
    // 失焦时总是显示验证结果
    this.showValidationError = true;
    if (this.isDirty) {
      this.validateValue();
    }
  }

  private shouldValidateRealtime(): boolean {
    return this.metadata.realtimeValidation !== false;
  }

  private validateValue(): void {
    if (!this.metadata.validationRules || this.metadata.validationRules.length === 0) {
      this.validationResult = { status: 'valid', isValid: true };
      return;
    }

    this.validationResult = this.validationService.validateValue(this.currentValue, this.metadata);

    // 发出验证结果变化事件
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.validationChange.emit({ keys, result: this.validationResult });
  }

  private emitChange(value: any): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.valueChange.emit({ keys, value });
  }

  // 样式相关方法
  getInputClasses(isFullWidth: boolean = true): string {
    const baseClasses = [
      'text-sm',
      'border',
      'rounded-lg',
      'focus:ring-2',
      'focus:ring-blue-500',
      'focus:border-blue-500',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'dark:focus:ring-blue-600',
      'dark:focus:border-blue-600',
      'transition-colors',
      'duration-200'
    ];

    if (isFullWidth) {
      baseClasses.push('block', 'w-full');
    } else {
      baseClasses.push('flex-1');
    }

    // 验证状态样式
    if (this.showValidation && this.isDirty) {
      if (!this.validationResult.isValid) {
        baseClasses.push(
          'border-red-300',
          'bg-red-50',
          'text-red-900',
          'dark:border-red-600',
          'dark:bg-red-900/20',
          'dark:text-red-200',
          'focus:ring-red-500',
          'focus:border-red-500'
        );
      } else if (this.validationResult.status === 'valid') {
        baseClasses.push(
          'border-green-300',
          'bg-green-50',
          'text-green-900',
          'dark:border-green-600',
          'dark:bg-green-900/20',
          'dark:text-green-200',
          'focus:ring-green-500',
          'focus:border-green-500'
        );
      }
    } else {
      baseClasses.push(
        'border-gray-300',
        'bg-white',
        'text-gray-900',
        'dark:bg-gray-700',
        'dark:border-gray-600',
        'dark:text-white'
      );
    }

    baseClasses.push('px-4', 'py-2');
    return baseClasses.join(' ');
  }

  getValidationStatusClass(): string {
    switch (this.validationResult.status) {
      case 'valid':
        return 'text-green-500 dark:text-green-400';
      case 'invalid':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  }

  getValidationErrorClass(): string {
    return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800';
  }

  getSliderValueClasses(): string {
    const baseClasses = ['border'];

    if (this.showValidation && this.isDirty && !this.validationResult.isValid) {
      baseClasses.push(
        'border-red-300',
        'bg-red-50',
        'text-red-900',
        'dark:border-red-600',
        'dark:bg-red-900/20',
        'dark:text-red-200'
      );
    } else {
      baseClasses.push(
        'border-gray-300',
        'bg-gray-50',
        'text-gray-600',
        'dark:border-gray-600',
        'dark:bg-gray-700',
        'dark:text-gray-400'
      );
    }

    return baseClasses.join(' ');
  }

  // 公共方法供父组件调用
  public validate(): ValidationResult {
    this.isDirty = true;
    this.showValidationError = true;
    this.validateValue();
    return this.validationResult;
  }

  public reset(): void {
    this.isDirty = false;
    this.showValidationError = false;
    this.validationResult = { status: 'valid', isValid: true };
    this.updateCurrentValue();
  }

  public isValid(): boolean {
    return this.validationResult.isValid;
  }
}