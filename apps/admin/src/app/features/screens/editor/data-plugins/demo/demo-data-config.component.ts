import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataSlotterService } from '../../data-slotter/data-slotter.service';
import { DataSlot, StaticDataConfig } from '../../models/data-source.model';
import { DataSourceType } from '../../models/data-source.enum';

@Component({
  selector: 'app-demo-data-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="demo-data-config">
      <div class="form-group">
        <label>示例数据 (JSON格式)</label>
        <textarea
          [(ngModel)]="jsonData"
          (ngModelChange)="onDataChange()"
          name="jsonData"
          rows="10"
          class="form-control"
          placeholder='{"key": "value"}'
        ></textarea>
        @if (parseError) {
          <div class="error-message">{{ parseError }}</div>
        }
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          (click)="onDebug()"
          [disabled]="!!parseError"
        >
          调试数据
        </button>
      </div>
    </div>
  `,
  styles: [`
    .demo-data-config {
      padding: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      resize: vertical;
    }

    textarea:focus {
      outline: none;
      border-color: #1890ff;
    }

    .error-message {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background-color: #fff2f0;
      border: 1px solid #ffccc7;
      border-radius: 4px;
      color: #cf1322;
      font-size: 0.875rem;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.3s;
    }

    .btn-primary {
      background-color: #1890ff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #40a9ff;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class DemoDataConfigComponent implements OnInit {
  @Input() slot!: DataSlot;

  jsonData: string = '{}';
  parseError: string | null = null;

  constructor(private dataSlotterService: DataSlotterService) {}

  ngOnInit(): void {
    if (this.slot?.dataConfig) {
      const config = this.slot.dataConfig as StaticDataConfig;
      this.jsonData = JSON.stringify(config.data || {}, null, 2);
    }
  }

  onDataChange(): void {
    try {
      const data = JSON.parse(this.jsonData);
      this.parseError = null;

      const config: StaticDataConfig = {
        type: DataSourceType.STATIC,
        mode: this.slot.dataConfig.mode,
        options: { data },
        data
      };

      this.dataSlotterService.updateDataConfig(this.slot.id, config);
    } catch (error) {
      this.parseError = error instanceof Error ? error.message : 'JSON解析错误';
    }
  }

  onDebug(): void {
    if (!this.parseError) {
      this.dataSlotterService.debugDataSource(this.slot.id);
    }
  }
}
