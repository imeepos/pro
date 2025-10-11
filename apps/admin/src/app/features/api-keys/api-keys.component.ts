import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil, startWith, map } from 'rxjs/operators';

import { SkerSDK, ApiKey, ApiKeyFilters, ApiKeyStats, ApiKeyStatus, ApiKeyType } from '@pro/sdk';
import { ApiKeyTableComponent, ApiKeyModalComponent, ApiKeyStatsComponent } from './components';
import { ApiKeyService } from './services';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ApiKeyTableComponent,
    ApiKeyModalComponent,
    ApiKeyStatsComponent
  ],
  templateUrl: './api-keys.component.html',
  styleUrls: ['./api-keys.component.scss']
})
export class ApiKeysComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 数据状态
  apiKeys: ApiKey[] = [];
  selectedApiKey: ApiKey | null = null;
  stats: ApiKeyStats | null = null;
  loading: boolean = false;
  error: string | null = null;

  // UI 状态
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showRegenerateModal = false;

  // 搜索和过滤表单
  searchForm: FormGroup;

  // 分页
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  constructor(
    private fb: FormBuilder,
    private apiKeyService: ApiKeyService,
    private sdk: SkerSDK
  ) {
    this.searchForm = this.fb.group({
      search: [''],
      status: [''],
      type: [''],
      isActive: [true],
      sortBy: ['createdAt'],
      sortOrder: ['desc']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSearchFormListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.apiKeyService.loadApiKeys();
    this.apiKeyService.loadStats();

    // 订阅服务状态
    this.apiKeyService.apiKeys$
      .pipe(takeUntil(this.destroy$))
      .subscribe(apiKeys => {
        this.apiKeys = apiKeys || [];
      });

    this.apiKeyService.selectedApiKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe(apiKey => {
        this.selectedApiKey = apiKey;
      });

    this.apiKeyService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.stats = stats;
      });

    this.apiKeyService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading || false;
      });

    this.apiKeyService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });
  }

  private setupSearchFormListener(): void {
    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  applyFilters(): void {
    const formValue = this.searchForm.value;
    const filters: ApiKeyFilters = {
      ...formValue,
      page: this.currentPage,
      limit: this.pageSize
    };

    this.apiKeyService.loadApiKeys(filters);
  }

  onApiKeySelected(apiKey: ApiKey): void {
    this.apiKeyService.selectApiKey(apiKey);
  }

  onCreateApiKey(): void {
    this.showCreateModal = true;
  }

  onEditApiKey(apiKey: ApiKey): void {
    this.apiKeyService.selectApiKey(apiKey);
    this.showEditModal = true;
  }

  onDeleteApiKey(apiKey: ApiKey): void {
    this.apiKeyService.selectApiKey(apiKey);
    this.showDeleteModal = true;
  }

  onToggleApiKeyStatus(apiKey: ApiKey): void {
    const action = apiKey.isActive ? '停用' : '启用';
    if (confirm(`确定要${action}这个 API Key 吗？`)) {
      if (apiKey.isActive) {
        this.apiKeyService.deactivateApiKey(apiKey.id);
      } else {
        this.apiKeyService.activateApiKey(apiKey.id);
      }
    }
  }

  onRegenerateApiKey(apiKey: ApiKey): void {
    this.apiKeyService.selectApiKey(apiKey);
    this.showRegenerateModal = true;
  }

  onCopyApiKey(apiKey: ApiKey): void {
    this.copyToClipboard(apiKey.key);
  }

  onViewStats(apiKey: ApiKey): void {
    this.apiKeyService.selectApiKey(apiKey);
    this.apiKeyService.loadUsageStats(apiKey.id);
  }

  onRefresh(): void {
    this.loadInitialData();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }

  onModalClose(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showRegenerateModal = false;
    this.apiKeyService.clearSelectedApiKey();
  }

  onApiKeyCreated(apiKey: ApiKey): void {
    this.onModalClose();
    this.loadInitialData();
  }

  onApiKeyUpdated(apiKey: ApiKey): void {
    this.onModalClose();
    this.loadInitialData();
  }

  onApiKeyDeleted(): void {
    this.onModalClose();
    this.loadInitialData();
  }

  onApiKeyRegenerated(): void {
    this.onModalClose();
    this.loadInitialData();
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // 这里可以添加一个提示消息
      console.log('API Key 已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
    });
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

  // 格式化显示的 API Key
  formatApiKey(key: string): string {
    if (!key) return '';
    return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
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

  // TrackBy 方法
  trackByApiKeyId(index: number, apiKey: ApiKey): number {
    return apiKey.id;
  }
}