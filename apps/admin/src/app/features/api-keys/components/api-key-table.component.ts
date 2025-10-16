import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiKey, ApiKeyStatus, ApiKeyType } from '@pro/types';

@Component({
  selector: 'app-api-key-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-key-table.component.html',
  styleUrls: ['./api-key-table.component.scss']
})
export class ApiKeyTableComponent implements OnChanges {
  @Input() apiKeys: ApiKey[] = [];
  @Input() selectedApiKey: ApiKey | null = null;
  @Input() loading: boolean = false;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() totalItems: number = 0;

  @Output() apiKeySelected = new EventEmitter<ApiKey>();
  @Output() editApiKey = new EventEmitter<ApiKey>();
  @Output() deleteApiKey = new EventEmitter<ApiKey>();
  @Output() toggleStatus = new EventEmitter<ApiKey>();
  @Output() regenerateApiKey = new EventEmitter<ApiKey>();
  @Output() copyApiKey = new EventEmitter<ApiKey>();
  @Output() viewStats = new EventEmitter<ApiKey>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  // 显示完整 API Key 的映射
  showFullApiKey: Map<number, boolean> = new Map();

  // 计算总页数
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  // 生成页码数组
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      if (start > 1) pages.push(1);
      if (start > 2) pages.push(-1); // 省略号

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < this.totalPages - 1) pages.push(-1); // 省略号
      if (end < this.totalPages) pages.push(this.totalPages);
    }

    return pages;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['apiKeys'] && changes['apiKeys'].currentValue) {
      // 重置显示状态
      this.showFullApiKey.clear();
    }
  }

  // 切换 API Key 显示状态
  toggleApiKeyVisibility(apiKey: ApiKey): void {
    const currentState = this.showFullApiKey.get(apiKey.id) || false;
    this.showFullApiKey.set(apiKey.id, !currentState);
  }

  // 获取显示的 API Key 文本
  getDisplayedApiKey(apiKey: ApiKey): string {
    const showFull = this.showFullApiKey.get(apiKey.id) || false;
    if (showFull) {
      return apiKey.key;
    }
    return this.formatApiKey(apiKey.key);
  }

  // 格式化 API Key
  formatApiKey(key: string): string {
    if (!key) return '';
    return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
  }

  // 获取状态徽章样式
  getStatusBadgeClass(status: ApiKeyStatus): string {
    switch (status) {
      case ApiKeyStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case ApiKeyStatus.INACTIVE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ApiKeyStatus.EXPIRED:
        return 'bg-red-100 text-red-800 border-red-200';
      case ApiKeyStatus.REVOKED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // 获取状态文本
  getStatusText(status: ApiKeyStatus): string {
    switch (status) {
      case ApiKeyStatus.ACTIVE:
        return '活跃';
      case ApiKeyStatus.INACTIVE:
        return '未激活';
      case ApiKeyStatus.EXPIRED:
        return '已过期';
      case ApiKeyStatus.REVOKED:
        return '已撤销';
      default:
        return '未知';
    }
  }

  // 获取类型徽章样式
  getTypeBadgeClass(type: ApiKeyType): string {
    switch (type) {
      case ApiKeyType.READ_ONLY:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ApiKeyType.READ_WRITE:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case ApiKeyType.ADMIN:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // 获取类型文本
  getTypeText(type: ApiKeyType): string {
    switch (type) {
      case ApiKeyType.READ_ONLY:
        return '只读';
      case ApiKeyType.READ_WRITE:
        return '读写';
      case ApiKeyType.ADMIN:
        return '管理员';
      default:
        return '未知';
    }
  }

  // 检查是否即将过期
  isExpiringSoon(expiresAt: Date | undefined): boolean {
    if (!expiresAt) return false;
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }

  // 格式化日期
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 格式化相对时间
  formatRelativeTime(date: Date | string | undefined): string {
    if (!date) return '从未使用';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 30) return `${diffDays} 天前`;

    return this.formatDate(date);
  }

  // 获取操作按钮的禁用状态
  isActionDisabled(apiKey: ApiKey, action: string): boolean {
    switch (action) {
      case 'edit':
      case 'delete':
        return apiKey.status === ApiKeyStatus.REVOKED;
      case 'toggle':
        return apiKey.status === ApiKeyStatus.EXPIRED || apiKey.status === ApiKeyStatus.REVOKED;
      case 'regenerate':
        return apiKey.status === ApiKeyStatus.REVOKED;
      default:
        return false;
    }
  }

  // 获取切换状态按钮文本
  getToggleStatusText(apiKey: ApiKey): string {
    return apiKey.isActive ? '停用' : '启用';
  }

  // 获取切换状态按钮样式
  getToggleStatusClass(apiKey: ApiKey): string {
    if (apiKey.isActive) {
      return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    }
    return 'bg-green-500 hover:bg-green-600 text-white';
  }

  // 检查 API Key 是否被选中
  isApiKeySelected(apiKey: ApiKey): boolean {
    return this.selectedApiKey?.id === apiKey.id;
  }

  // 分页方法
  onPrevPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number): void {
    if (newSize !== this.pageSize) {
      this.pageSizeChange.emit(newSize);
    }
  }

  // 获取显示的条目范围
  getDisplayRange(): string {
    if (this.totalItems === 0) return '0 条记录';

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);

    return `显示 ${start}-${end} 条，共 ${this.totalItems} 条`;
  }

  // TrackBy 方法
  trackByApiKeyId(index: number, apiKey: ApiKey): number {
    return apiKey.id;
  }

  trackByPage(index: number, page: number): number {
    return page;
  }
}
