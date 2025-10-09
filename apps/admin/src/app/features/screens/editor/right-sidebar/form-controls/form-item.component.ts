import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormMetadata } from '../../models/form-metadata.model';

@Component({
  selector: 'app-form-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-item mb-4" *ngIf="!metadata.showIf || metadata.showIf(formData)">
      <div class="flex items-center mb-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ metadata.label }}
        </label>
        <span
          *ngIf="metadata.tooltip"
          class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors duration-200"
          [title]="metadata.tooltip"
        >
          <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
        </span>
      </div>

      <!-- Input -->
      <input
        *ngIf="metadata.type === 'input'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        class="block w-full text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 px-4 py-2"
      />

      <!-- Number -->
      <input
        *ngIf="metadata.type === 'number'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        type="number"
        [min]="metadata.min || 0"
        [max]="metadata.max || 100"
        [step]="metadata.step || 1"
        class="block w-full text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 px-4 py-2"
      />

      <!-- Textarea -->
      <textarea
        *ngIf="metadata.type === 'textarea'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onInputChange($event)"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="!!metadata.disabled"
        rows="3"
        class="block w-full text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 px-4 py-2"
      ></textarea>

      <!-- Select -->
      <select
        *ngIf="metadata.type === 'select'"
        [(ngModel)]="currentValue"
        (ngModelChange)="onSelectChange($event)"
        [disabled]="!!metadata.disabled"
        class="block w-full text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 px-4 py-2"
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
          [disabled]="!!metadata.disabled"
          class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer disabled:opacity-50"
        />
        <input
          type="text"
          [(ngModel)]="currentValue"
          (ngModelChange)="onInputChange($event)"
          [disabled]="!!metadata.disabled"
          class="flex-1 block w-full text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600 px-4 py-2"
        />
      </div>

      <!-- Slider -->
      <div *ngIf="metadata.type === 'slider'" class="flex items-center gap-3">
        <input
          type="range"
          [(ngModel)]="currentValue"
          (ngModelChange)="onInputChange($event)"
          [min]="metadata.min || 0"
          [max]="metadata.max || 100"
          [step]="metadata.step || 1"
          [disabled]="!!metadata.disabled"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right min-w-[3rem] text-center">
          {{ currentValue }}
        </span>
      </div>
    </div>
  `
})
export class FormItemComponent implements OnInit, OnChanges {
  @Input() metadata!: FormMetadata;
  @Input() formData: any = {};
  @Output() valueChange = new EventEmitter<{ keys: string[]; value: any }>();

  currentValue: any;

  ngOnInit(): void {
    this.updateCurrentValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metadata'] || changes['formData']) {
      this.updateCurrentValue();
    }
  }

  private updateCurrentValue(): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.currentValue = this.getNestedValue(this.formData, keys);
  }

  private getNestedValue(obj: any, keys: string[]): any {
    return keys.reduce((acc, key) => acc?.[key], obj);
  }

  onInputChange(value: any): void {
    // 处理值变化，根据类型进行适当转换
    const processedValue = this.metadata.type === 'number' ? parseFloat(value) : value;
    this.emitChange(processedValue);
  }

  onSelectChange(value: any): void {
    // 下拉选择处理
    this.emitChange(value);
  }

  onSwitchChange(value: boolean): void {
    // 开关处理
    this.emitChange(value);
  }

  private emitChange(value: any): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.valueChange.emit({ keys, value });
  }
}