import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BugService } from '../../services/bug.service';

@Component({
  selector: 'app-health-check',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-white rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-4">GraphQL 服务器健康检查</h2>

      <div class="space-y-4">
        <button
          (click)="testConnection()"
          [disabled]="isTesting"
          class="btn-primary">
          {{ isTesting ? '测试中...' : '测试 GraphQL 连接' }}
        </button>

        <div *ngIf="result" class="p-3 rounded border" [class.bg-green-50]="result.success" [class.bg-red-50]="!result.success">
          <h3 class="font-medium" [class.text-green-700]="result.success" [class.text-red-700]="!result.success">
            {{ result.success ? '✅ 连接正常' : '❌ 连接失败' }}
          </h3>
          <p *ngIf="result.data" class="text-sm text-gray-600 mt-1">
            状态: {{ result.data.status }}
          </p>
          <p *ngIf="result.error" class="text-sm text-red-600 mt-1">
            错误: {{ result.error.message }}
          </p>
        </div>

        <div *ngIf="debugInfo" class="p-3 bg-gray-50 rounded border">
          <h4 class="font-medium text-gray-700">调试信息</h4>
          <pre class="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{{ debugInfo | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class HealthCheckComponent {
  private bugService = inject(BugService);

  isTesting = false;
  result: any = null;
  debugInfo: any = null;

  async testConnection() {
    this.isTesting = true;
    this.result = null;
    this.debugInfo = null;

    try {
      this.bugService.healthCheck().subscribe({
        next: (result) => {
          this.isTesting = false;
          this.result = result;
          this.debugInfo = {
            timestamp: new Date().toISOString(),
            success: result.success,
            data: result.data,
            error: result.error
          };
        },
        error: (error) => {
          this.isTesting = false;
          this.result = {
            success: false,
            error: { message: error.message }
          };
          this.debugInfo = {
            timestamp: new Date().toISOString(),
            error: error
          };
        }
      });
    } catch (error) {
      this.isTesting = false;
      this.result = {
        success: false,
        error: { message: '测试过程中发生异常' }
      };
      this.debugInfo = {
        timestamp: new Date().toISOString(),
        error: error
      };
    }
  }
}