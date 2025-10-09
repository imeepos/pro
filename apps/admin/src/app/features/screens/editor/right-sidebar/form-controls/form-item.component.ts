import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormMetadata } from '../../models/form-metadata.model';

@Component({
  selector: 'app-form-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-item mb-4" *ngIf="!metadata.showIf || metadata.showIf(formData)">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ metadata.label }}
        <span *ngIf="metadata.tooltip" class="ml-1 text-gray-400" [title]="metadata.tooltip">
          <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
        </span>
      </label>

      <!-- Input -->
      <input
        *ngIf="metadata.type === 'input'"
        type="text"
        [value]="currentValue"
        (input)="onInputChange($event)"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="metadata.disabled"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      />

      <!-- Number -->
      <input
        *ngIf="metadata.type === 'number'"
        type="number"
        [value]="currentValue"
        (input)="onInputChange($event)"
        [min]="metadata.min"
        [max]="metadata.max"
        [step]="metadata.step || 1"
        [disabled]="metadata.disabled"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      />

      <!-- Textarea -->
      <textarea
        *ngIf="metadata.type === 'textarea'"
        [value]="currentValue"
        (input)="onInputChange($event)"
        [placeholder]="metadata.placeholder || ''"
        [disabled]="metadata.disabled"
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      ></textarea>

      <!-- Select -->
      <select
        *ngIf="metadata.type === 'select'"
        [value]="currentValue"
        (change)="onSelectChange($event)"
        [disabled]="metadata.disabled"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      >
        <option *ngFor="let option of metadata.options" [value]="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Switch -->
      <label *ngIf="metadata.type === 'switch'" class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          [checked]="currentValue"
          (change)="onSwitchChange($event)"
          [disabled]="metadata.disabled"
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>

      <!-- Color -->
      <div *ngIf="metadata.type === 'color'" class="flex items-center gap-2">
        <input
          type="color"
          [value]="currentValue || '#000000'"
          (input)="onInputChange($event)"
          [disabled]="metadata.disabled"
          class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
        />
        <input
          type="text"
          [value]="currentValue"
          (input)="onInputChange($event)"
          [disabled]="metadata.disabled"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <!-- Slider -->
      <div *ngIf="metadata.type === 'slider'" class="flex items-center gap-3">
        <input
          type="range"
          [value]="currentValue"
          (input)="onInputChange($event)"
          [min]="metadata.min || 0"
          [max]="metadata.max || 100"
          [step]="metadata.step || 1"
          [disabled]="metadata.disabled"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
          {{ currentValue }}
        </span>
      </div>
    </div>
  `
})
export class FormItemComponent implements OnInit {
  @Input() metadata!: FormMetadata;
  @Input() formData: any = {};
  @Output() valueChange = new EventEmitter<{ keys: string[]; value: any }>();

  currentValue: any;

  ngOnInit(): void {
    this.updateCurrentValue();
  }

  ngOnChanges(): void {
    this.updateCurrentValue();
  }

  private updateCurrentValue(): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.currentValue = this.getNestedValue(this.formData, keys);
  }

  private getNestedValue(obj: any, keys: string[]): any {
    return keys.reduce((acc, key) => acc?.[key], obj);
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = this.metadata.type === 'number' ? parseFloat(target.value) : target.value;
    this.emitChange(value);
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.emitChange(target.value);
  }

  onSwitchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.emitChange(target.checked);
  }

  private emitChange(value: any): void {
    const keys = Array.isArray(this.metadata.key) ? this.metadata.key : [this.metadata.key];
    this.valueChange.emit({ keys, value });
  }
}
