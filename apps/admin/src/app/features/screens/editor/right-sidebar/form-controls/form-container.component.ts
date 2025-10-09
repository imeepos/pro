import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormItemComponent } from './form-item.component';

@Component({
  selector: 'app-form-container',
  standalone: true,
  imports: [CommonModule, FormItemComponent],
  template: `
    <div class="form-container">
      <div *ngFor="let item of config" class="form-group">
        <div *ngIf="item.type === 'group'" class="mb-6">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            {{ item.label }}
          </h4>
          <div class="pl-2">
            <app-form-item
              *ngFor="let child of item.children"
              [metadata]="child"
              [formData]="formData"
              (valueChange)="onValueChange($event)"
            />
          </div>
        </div>

        <app-form-item
          *ngIf="item.type !== 'group'"
          [metadata]="item"
          [formData]="formData"
          (valueChange)="onValueChange($event)"
        />
      </div>
    </div>
  `
})
export class FormContainerComponent {
  @Input() config: FormMetadata[] = [];
  @Input() formData: any = {};
  @Output() change = new EventEmitter<FormChangeEvent>();

  onValueChange(event: FormChangeEvent): void {
    this.change.emit(event);
  }
}
