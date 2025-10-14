import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataSlotterService } from '../../data-slotter/data-slotter.service';
import { DataSlot, WebSocketDataConfig } from '../../models/data-source.model';
import { DataSourceType } from '../../models/data-source.enum';

@Component({
  selector: 'app-websocket-data-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="websocket-data-config">
      <div class="form-group">
        <label>WebSocket URL *</label>
        <input
          type="text"
          [(ngModel)]="url"
          (ngModelChange)="onConfigChange()"
          name="websocketUrl"
          class="form-control"
          placeholder="ws://localhost:8080/ws"
        />
        <small class="help-text">支持 ws:// 或 wss:// 协议</small>
      </div>

      <div class="form-group">
        <label>子协议 (可选)</label>
        <input
          type="text"
          [(ngModel)]="protocolsText"
          (ngModelChange)="onProtocolsChange()"
          name="protocolsText"
          class="form-control"
          placeholder="protocol1, protocol2"
        />
        <small class="help-text">多个协议用逗号分隔</small>
      </div>

      <div class="form-group">
        <label>重连间隔 (毫秒)</label>
        <input
          type="number"
          [(ngModel)]="reconnectInterval"
          (ngModelChange)="onConfigChange()"
          name="reconnectInterval"
          min="1000"
          step="1000"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>最大重连次数</label>
        <input
          type="number"
          [(ngModel)]="maxReconnectAttempts"
          (ngModelChange)="onConfigChange()"
          name="maxReconnectAttempts"
          min="0"
          max="100"
          class="form-control"
        />
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          (click)="onConnect()"
          [disabled]="!url"
        >
          连接测试
        </button>
      </div>

      <div class="info-box">
        <h4>使用说明</h4>
        <ul>
          <li>WebSocket会自动接收服务器推送的消息</li>
          <li>支持JSON格式数据自动解析</li>
          <li>连接断开时会自动尝试重连</li>
          <li>建议在生产环境使用wss://加密协议</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .websocket-data-config {
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

    .help-text {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #666;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-bottom: 1rem;
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

    .info-box {
      padding: 1rem;
      background-color: #f6f8fa;
      border-radius: 4px;
      border-left: 3px solid #1890ff;
    }

    .info-box h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: #333;
    }

    .info-box ul {
      margin: 0;
      padding-left: 1.5rem;
      font-size: 0.75rem;
      color: #666;
    }

    .info-box li {
      margin-bottom: 0.25rem;
    }
  `]
})
export class WebSocketDataConfigComponent implements OnInit {
  @Input() slot!: DataSlot;

  url: string = '';
  protocolsText: string = '';
  reconnectInterval: number = 3000;
  maxReconnectAttempts: number = 5;

  constructor(private dataSlotterService: DataSlotterService) {}

  ngOnInit(): void {
    if (this.slot?.dataConfig) {
      const config = this.slot.dataConfig as WebSocketDataConfig;
      this.url = config.url || '';
      this.protocolsText = config.protocols?.join(', ') || '';
      this.reconnectInterval = config.reconnectInterval ?? 3000;
      this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    }
  }

  onProtocolsChange(): void {
    this.onConfigChange();
  }

  onConfigChange(): void {
    if (!this.url) return;

    const protocols = this.protocolsText
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const config: WebSocketDataConfig = {
      type: DataSourceType.WEBSOCKET,
      mode: this.slot.dataConfig.mode,
      url: this.url,
      protocols: protocols.length > 0 ? protocols : undefined,
      reconnectInterval: this.reconnectInterval,
      maxReconnectAttempts: this.maxReconnectAttempts,
      options: {}
    };

    this.dataSlotterService.updateDataConfig(this.slot.id, config);
  }

  onConnect(): void {
    if (this.url) {
      this.dataSlotterService.connectDataSource(this.slot.id);
    }
  }
}
