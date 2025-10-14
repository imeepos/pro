import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialDateTimePickerComponent } from './material-date-time-picker.component';

@Component({
  selector: 'app-material-date-time-picker-example',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialDateTimePickerComponent
  ],
  template: `
    <div class="example-container">
      <h2>Material DateTimePicker 示例</h2>

      <!-- 基础用法示例 -->
      <div class="example-section">
        <h3>基础用法</h3>
        <pro-material-date-time-picker
          [(ngModel)]="basicDate"
          placeholder="请选择日期时间"
          [showTime]="true"
          [allowClear]="true"
        ></pro-material-date-time-picker>
        <p class="result">选中的日期: {{ basicDate | date:'yyyy-MM-dd HH:mm:ss' }}</p>
      </div>

      <!-- 表单控件示例 -->
      <div class="example-section">
        <h3>表单控件用法</h3>
        <form [formGroup]="exampleForm" (ngSubmit)="onSubmit()">
          <pro-material-date-time-picker
            formControlName="eventTime"
            placeholder="请选择事件时间"
            [required]="true"
            [showTime]="true"
            [allowClear]="true"
          ></pro-material-date-time-picker>

          <div class="form-status">
            <p>表单状态: {{ exampleForm.valid ? '有效' : '无效' }}</p>
            <p>表单值: {{ exampleForm.value | json }}</p>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="!exampleForm.valid">
              提交
            </button>
            <button type="button" (click)="resetForm()">
              重置
            </button>
          </div>
        </form>
      </div>

      <!-- 限制日期范围示例 -->
      <div class="example-section">
        <h3>限制日期范围</h3>
        <pro-material-date-time-picker
          [(ngModel)]="restrictedDate"
          placeholder="只能选择今天以后的日期"
          [minDate]="minDate"
          [maxDate]="maxDate"
          [showTime]="true"
        ></pro-material-date-time-picker>
        <p class="result">选中的日期: {{ restrictedDate | date:'yyyy-MM-dd HH:mm:ss' }}</p>
      </div>

      <!-- 仅日期选择示例 -->
      <div class="example-section">
        <h3>仅日期选择</h3>
        <pro-material-date-time-picker
          [(ngModel)]="dateOnly"
          placeholder="请选择日期"
          [showTime]="false"
          [allowClear]="true"
        ></pro-material-date-time-picker>
        <p class="result">选中的日期: {{ dateOnly | date:'yyyy-MM-dd' }}</p>
      </div>
    </div>
  `,
  styles: [`
    .example-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .example-section {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .example-section h3 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 8px;
    }

    .result {
      margin-top: 10px;
      padding: 10px;
      background-color: #e3f2fd;
      border-radius: 4px;
      font-family: monospace;
    }

    .form-status {
      margin: 15px 0;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .form-actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }

    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    button[type="submit"] {
      background-color: #1976d2;
      color: white;
    }

    button[type="submit"]:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    button[type="button"] {
      background-color: #f5f5f5;
      color: #333;
      border: 1px solid #ddd;
    }

    button:hover {
      opacity: 0.8;
    }
  `]
})
export class MaterialDateTimePickerExampleComponent {
  // 基础用法
  basicDate: Date | null = null;

  // 限制日期范围
  minDate: Date = new Date();
  maxDate: Date = new Date(new Date().setMonth(new Date().getMonth() + 6));
  restrictedDate: Date | null = null;

  // 仅日期
  dateOnly: Date | null = null;

  // 表单示例
  exampleForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.exampleForm = this.fb.group({
      eventTime: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.exampleForm.valid) {
      console.log('表单提交:', this.exampleForm.value);
      alert('表单提交成功！请查看控制台输出。');
    }
  }

  resetForm(): void {
    this.exampleForm.reset();
  }
}