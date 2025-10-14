import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataSlotterService } from '../../data-slotter/data-slotter.service';
import { DataSlot, ApiDataConfig } from '../../models/data-source.model';
import { DataSourceType, RequestMethod } from '../../models/data-source.enum';

interface HeaderItem {
  key: string;
  value: string;
}

@Component({
  selector: 'app-api-data-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-data-config">
      <div class="form-group">
        <label>请求URL *</label>
        <input
          type="text"
          [(ngModel)]="url"
          (ngModelChange)="onConfigChange()"
          name="requestUrl"
          class="form-control"
          placeholder="https://api.example.com/data"
        />
      </div>

      <div class="form-group">
        <label>请求方法</label>
        <select
          [(ngModel)]="method"
          (ngModelChange)="onConfigChange()"
          name="requestMethod"
          class="form-control"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div class="form-group">
        <label>请求头 (Headers)</label>
        <div class="header-list">
          @for (header of headers; track $index) {
            <div class="header-item">
              <input
                type="text"
                [(ngModel)]="header.key"
                (ngModelChange)="onConfigChange()"
                name="headerKey-{{$index}}"
                placeholder="Key"
                class="header-key"
              />
              <input
                type="text"
                [(ngModel)]="header.value"
                (ngModelChange)="onConfigChange()"
                name="headerValue-{{$index}}"
                placeholder="Value"
                class="header-value"
              />
              <button
                type="button"
                class="btn-remove"
                (click)="removeHeader($index)"
              >
                ✕
              </button>
            </div>
          }
        </div>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="addHeader()"
        >
          添加请求头
        </button>
      </div>

      @if (method !== 'GET' && method !== 'DELETE') {
        <div class="form-group">
          <label>请求体 (JSON格式)</label>
          <textarea
            [(ngModel)]="bodyJson"
            (ngModelChange)="onBodyChange()"
            name="requestBody"
            rows="6"
            class="form-control"
            placeholder='{"key": "value"}'
          ></textarea>
          @if (bodyParseError) {
            <div class="error-message">{{ bodyParseError }}</div>
          }
        </div>
      }

      <div class="form-group">
        <label>
          <input
            type="checkbox"
            [(ngModel)]="enableInterval"
            (ngModelChange)="onConfigChange()"
            name="enableInterval"
          />
          定时刷新
        </label>
        @if (enableInterval) {
          <div class="interval-input">
            <input
              type="number"
              [(ngModel)]="interval"
              (ngModelChange)="onConfigChange()"
              name="refreshInterval"
              min="1000"
              step="1000"
              class="form-control"
            />
            <span>毫秒</span>
          </div>
        }
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          (click)="onTest()"
          [disabled]="!url"
        >
          测试请求
        </button>
      </div>
    </div>
  `,
  styles: [`
    .api-data-config {
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

    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #1890ff;
    }

    select.form-control {
      cursor: pointer;
    }

    textarea.form-control {
      font-family: 'Courier New', monospace;
      resize: vertical;
    }

    .header-list {
      margin-bottom: 0.5rem;
    }

    .header-item {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .header-key,
    .header-value {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .header-key {
      flex: 1;
    }

    .header-value {
      flex: 2;
    }

    .btn-remove {
      padding: 0.5rem;
      background: #ff4d4f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      width: 32px;
    }

    .btn-remove:hover {
      background: #ff7875;
    }

    .interval-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .interval-input input {
      flex: 1;
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

    .btn-secondary {
      background-color: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background-color: #e0e0e0;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ApiDataConfigComponent implements OnInit {
  @Input() slot!: DataSlot;

  url: string = '';
  method: RequestMethod = RequestMethod.GET;
  headers: HeaderItem[] = [];
  bodyJson: string = '{}';
  bodyParseError: string | null = null;
  enableInterval: boolean = false;
  interval: number = 5000;

  constructor(private dataSlotterService: DataSlotterService) {}

  ngOnInit(): void {
    if (this.slot?.dataConfig) {
      const config = this.slot.dataConfig as ApiDataConfig;
      this.url = config.url || '';
      this.method = config.method || RequestMethod.GET;

      if (config.headers) {
        this.headers = Object.entries(config.headers).map(([key, value]) => ({
          key,
          value
        }));
      }

      if (config.body) {
        this.bodyJson = JSON.stringify(config.body, null, 2);
      }

      this.enableInterval = !!config.interval;
      this.interval = config.interval || 5000;
    }
  }

  addHeader(): void {
    this.headers.push({ key: '', value: '' });
  }

  removeHeader(index: number): void {
    this.headers.splice(index, 1);
    this.onConfigChange();
  }

  onBodyChange(): void {
    try {
      JSON.parse(this.bodyJson);
      this.bodyParseError = null;
      this.onConfigChange();
    } catch (error) {
      this.bodyParseError = error instanceof Error ? error.message : 'JSON解析错误';
    }
  }

  onConfigChange(): void {
    if (!this.url) return;

    const headersObj: Record<string, string> = {};
    this.headers
      .filter(h => h.key && h.value)
      .forEach(h => {
        headersObj[h.key] = h.value;
      });

    let body: any = undefined;
    if (this.method !== 'GET' && this.method !== 'DELETE' && this.bodyJson) {
      try {
        body = JSON.parse(this.bodyJson);
      } catch {
        return;
      }
    }

    const config: ApiDataConfig = {
      type: DataSourceType.API,
      mode: this.slot.dataConfig.mode,
      url: this.url,
      method: this.method,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      body,
      interval: this.enableInterval ? this.interval : undefined,
      options: {}
    };

    this.dataSlotterService.updateDataConfig(this.slot.id, config);
  }

  onTest(): void {
    if (this.url && !this.bodyParseError) {
      this.dataSlotterService.debugDataSource(this.slot.id);
    }
  }
}
