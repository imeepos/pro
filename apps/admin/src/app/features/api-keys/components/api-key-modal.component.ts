import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiKey, CreateApiKeyDto, UpdateApiKeyDto, ApiKeyRegenerationResponse } from '@pro/sdk';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKeyFormComponent } from './api-key-form.component';

export type ModalMode = 'create' | 'edit' | 'delete' | 'regenerate';

@Component({
  selector: 'app-api-key-modal',
  standalone: true,
  imports: [CommonModule, ApiKeyFormComponent],
  templateUrl: './api-key-modal.component.html',
  styleUrls: ['./api-key-modal.component.scss']
})
export class ApiKeyModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() visible: boolean = false;
  @Input() title: string = '';
  @Input() apiKey: ApiKey | null = null;
  @Input() mode: ModalMode = 'create';

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<ApiKey>();
  @Output() updated = new EventEmitter<ApiKey>();
  @Output() deleted = new EventEmitter<void>();
  @Output() regenerated = new EventEmitter<ApiKeyRegenerationResponse>();

  // 状态管理
  loading: boolean = false;
  error: string | null = null;
  newApiKey: string | null = null;
  showNewApiKey = false;

  constructor(
    private apiKeyService: ApiKeyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 监听服务状态
    this.apiKeyService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.apiKeyService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 关闭模态框
  onClose(): void {
    this.resetState();
    this.close.emit();
  }

  // 阻止背景点击关闭
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // 阻止事件冒泡
  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  // ESC键关闭
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  // 表单提交处理
  onFormSubmit(data: CreateApiKeyDto | UpdateApiKeyDto): void {
    console.log('🔍 [API Key Modal] 表单提交处理开始');
    console.log('🔍 [API Key Modal] 当前模式:', this.mode);
    console.log('🔍 [API Key Modal] 接收到的数据:', data);
    console.log('🔍 [API Key Modal] 当前API Key:', this.apiKey);

    // 防止重复提交
    if (this.loading) {
      console.warn('⚠️ [API Key Modal] 模态框正在加载中，忽略重复提交');
      return;
    }

    // 验证数据有效性
    if (!this.validateSubmissionData(data)) {
      console.error('❌ [API Key Modal] 提交数据验证失败');
      return;
    }

    this.clearError();

    switch (this.mode) {
      case 'create':
        console.log('✅ [API Key Modal] 处理创建模式');
        this.handleCreate(data as CreateApiKeyDto);
        break;
      case 'edit':
        console.log('✅ [API Key Modal] 处理编辑模式');
        this.handleEdit(data as UpdateApiKeyDto);
        break;
      default:
        console.warn('⚠️ [API Key Modal] 未知模式:', this.mode);
        break;
    }
  }

  // 验证提交数据
  private validateSubmissionData(data: CreateApiKeyDto | UpdateApiKeyDto): boolean {
    if (!data) {
      this.error = '提交数据为空';
      return false;
    }

    // 验证必填字段
    if (!data.name || data.name.trim() === '') {
      this.error = 'API Key 名称不能为空';
      return false;
    }

    // 验证类型
    if (!data.type) {
      this.error = 'API Key 类型不能为空';
      return false;
    }

    // 验证权限
    if (!data.permissions || !Array.isArray(data.permissions)) {
      this.error = '权限配置无效';
      return false;
    }

    console.log('✅ [API Key Modal] 数据验证通过:', data);
    return true;
  }

  // 处理创建
  private handleCreate(data: CreateApiKeyDto): void {
    this.apiKeyService.createApiKey(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiKey) => {
          this.newApiKey = apiKey.key;
          this.showNewApiKey = true;
          this.created.emit(apiKey);
        },
        error: (error) => {
          console.error('创建 API Key 失败:', error);
        }
      });
  }

  // 处理编辑
  private handleEdit(data: UpdateApiKeyDto): void {
    if (!this.apiKey) return;

    console.log('🔍 [API Key Modal] 开始处理编辑操作:', {
      apiKeyId: this.apiKey.id,
      currentType: this.apiKey.type,
      updateData: data
    });

    // 再次验证数据，确保没有意外字段
    const cleanData = this.cleanUpdateData(data);
    console.log('🧹 [API Key Modal] 清理后的更新数据:', cleanData);

    this.apiKeyService.updateApiKey(this.apiKey.id, cleanData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiKey) => {
          console.log('✅ [API Key Modal] API Key 更新成功，准备发送事件:', apiKey);
          // 立即发送更新事件，不使用延迟
          this.updated.emit(apiKey);
          console.log('📤 [API Key Modal] 已发送更新事件');
        },
        error: (error) => {
          console.error('❌ [API Key Modal] 更新 API Key 失败:', error);
          this.error = '更新失败：' + (error?.error?.message || error?.message || '未知错误');
        }
      });
  }

  // 清理更新数据，移除不允许的字段
  private cleanUpdateData(data: UpdateApiKeyDto): UpdateApiKeyDto {
    const allowedFields: (keyof UpdateApiKeyDto)[] = ['name', 'description', 'type', 'expiresAt', 'permissions'];
    const cleaned: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in data && data[field] !== undefined) {
        cleaned[field] = data[field];
      }
    }

    // 检查并警告意外字段
    (Object.keys(data) as Array<keyof UpdateApiKeyDto>).forEach(key => {
      if (!allowedFields.includes(key)) {
        console.warn('⚠️ [API Key Modal] 移除不允许更新的字段:', key, data[key]);
      }
    });

    return cleaned as UpdateApiKeyDto;
  }

  // 处理删除
  onDelete(): void {
    if (!this.apiKey) return;

    this.clearError();
    this.apiKeyService.deleteApiKey(this.apiKey.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleted.emit();
        },
        error: (error) => {
          console.error('删除 API Key 失败:', error);
        }
      });
  }

  // 处理重新生成
  onRegenerate(): void {
    if (!this.apiKey) return;

    this.clearError();
    this.apiKeyService.regenerateApiKey(this.apiKey.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.newApiKey = response.newApiKey.key;
          this.showNewApiKey = true;
          this.regenerated.emit(response);
        },
        error: (error) => {
          console.error('重新生成 API Key 失败:', error);
        }
      });
  }

  // 复制新的 API Key
  copyNewApiKey(): void {
    if (!this.newApiKey) return;

    navigator.clipboard.writeText(this.newApiKey).then(() => {
      // 可以添加复制成功提示
      console.log('API Key 已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
    });
  }

  // 完成新 API Key 显示
  completeNewApiKey(): void {
    this.newApiKey = null;
    this.showNewApiKey = false;
    this.onClose();
  }

  // 获取模态框标题
  getModalTitle(): string {
    switch (this.mode) {
      case 'create':
        return '创建新的 API Key';
      case 'edit':
        return '编辑 API Key';
      case 'delete':
        return '删除 API Key';
      case 'regenerate':
        return '重新生成 API Key';
      default:
        return 'API Key 操作';
    }
  }

  // 获取确认信息
  getConfirmMessage(): string {
    if (!this.apiKey) return '';

    switch (this.mode) {
      case 'delete':
        return `您确定要删除 API Key "${this.apiKey.name}" 吗？此操作不可撤销，删除后所有使用此密钥的应用程序将无法访问系统。`;
      case 'regenerate':
        return `您确定要重新生成 API Key "${this.apiKey.name}" 吗？旧的密钥将立即失效，所有使用旧密钥的应用程序都需要更新。`;
      default:
        return '';
    }
  }

  // 获取警告信息
  getWarningMessage(): string {
    switch (this.mode) {
      case 'delete':
        return '⚠️ 删除后无法恢复，请确保已备份相关信息。';
      case 'regenerate':
        return '⚠️ 重新生成后，旧密钥将立即失效，请确保已准备好更新应用程序。';
      default:
        return '';
    }
  }

  // 获取按钮文本
  getActionButtonText(): string {
    switch (this.mode) {
      case 'delete':
        return '确认删除';
      case 'regenerate':
        return '重新生成';
      default:
        return '确认';
    }
  }

  // 获取按钮样式类
  getActionButtonClass(): string {
    switch (this.mode) {
      case 'delete':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'regenerate':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      default:
        return 'bg-primary hover:bg-primary-dark text-white';
    }
  }

  // 检查是否为危险操作
  isDangerousAction(): boolean {
    return this.mode === 'delete' || this.mode === 'regenerate';
  }

  // 格式化 API Key 显示
  formatApiKey(key: string): string {
    if (!key) return '';
    return `${key.substring(0, 12)}...${key.substring(key.length - 12)}`;
  }

  // 显示完整 API Key
  showFullApiKey: boolean = false;
  toggleFullApiKey(): void {
    this.showFullApiKey = !this.showFullApiKey;
  }

  // 获取显示的 API Key
  getDisplayedApiKey(): string {
    if (!this.newApiKey) return '';
    return this.showFullApiKey ? this.newApiKey : this.formatApiKey(this.newApiKey);
  }

  // 清除错误
  private clearError(): void {
    this.error = null;
  }

  // 重置状态
  private resetState(): void {
    this.loading = false;
    this.error = null;
    this.newApiKey = null;
    this.showNewApiKey = false;
    this.showFullApiKey = false;
  }

  // 检查表单是否可见
  isFormVisible(): boolean {
    return this.visible && ['create', 'edit'].includes(this.mode);
  }

  // 检查确认是否可见
  isConfirmVisible(): boolean {
    return this.visible && ['delete', 'regenerate'].includes(this.mode) && !this.showNewApiKey;
  }

  // 检查新 Key 显示是否可见
  isNewKeyVisible(): boolean {
    return this.visible && this.showNewApiKey && !!this.newApiKey;
  }

  // 获取操作描述
  getActionDescription(): string {
    switch (this.mode) {
      case 'create':
        return '创建一个新的 API Key，用于访问系统接口。请填写必要的信息并配置适当的权限。';
      case 'edit':
        return '修改现有 API Key 的配置信息。注意：某些修改可能需要重新部署相关应用程序。';
      case 'delete':
        return '永久删除此 API Key。删除后无法恢复，请谨慎操作。';
      case 'regenerate':
        return '重新生成 API Key。旧密钥将立即失效，需要及时更新相关应用程序。';
      default:
        return '';
    }
  }
}