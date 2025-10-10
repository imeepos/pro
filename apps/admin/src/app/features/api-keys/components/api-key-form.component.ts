import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiKey, CreateApiKeyDto, UpdateApiKeyDto, ApiKeyType, ApiKeyStatus } from '@pro/sdk';

@Component({
  selector: 'app-api-key-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './api-key-form.component.html',
  styleUrls: ['./api-key-form.component.scss']
})
export class ApiKeyFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() apiKey: ApiKey | null = null;
  @Input() loading: boolean = false;
  @Output() submit = new EventEmitter<CreateApiKeyDto | UpdateApiKeyDto>();
  @Output() cancel = new EventEmitter<void>();

  // 表单
  apiKeyForm: FormGroup;

  // 是否为编辑模式
  isEditMode = false;

  // 权限选项
  permissionOptions = [
    { value: 'read:events', label: '读取事件数据' },
    { value: 'write:events', label: '写入事件数据' },
    { value: 'delete:events', label: '删除事件数据' },
    { value: 'read:users', label: '读取用户信息' },
    { value: 'write:users', label: '修改用户信息' },
    { value: 'read:config', label: '读取配置信息' },
    { value: 'write:config', label: '修改配置信息' },
    { value: 'admin:all', label: '管理员权限' }
  ];

  // API 类型选项
  apiTypeOptions = [
    { value: ApiKeyType.READ_ONLY, label: '只读', description: '只能读取数据，无法修改' },
    { value: ApiKeyType.READ_WRITE, label: '读写', description: '可以读取和写入数据' },
    { value: ApiKeyType.ADMIN, label: '管理员', description: '完全访问权限' }
  ];

  constructor(private fb: FormBuilder) {
    this.apiKeyForm = this.createForm();
  }

  ngOnInit(): void {
    this.isEditMode = !!this.apiKey;
    if (this.isEditMode && this.apiKey) {
      this.patchForm(this.apiKey);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 创建表单
  private createForm(): FormGroup {
    const form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: [ApiKeyType.READ_ONLY, [Validators.required]],
      expiresAt: [null],
      permissions: [[]]
    });

    // 监听类型变化，自动设置权限
    form.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updatePermissionsByType(type);
      });

    return form;
  }

  // 根据类型更新权限
  private updatePermissionsByType(type: ApiKeyType | null): void {
    if (!type) return;
    const permissionsControl = this.apiKeyForm.get('permissions');

    switch (type) {
      case ApiKeyType.READ_ONLY:
        permissionsControl?.setValue(['read:events', 'read:users', 'read:config']);
        permissionsControl?.disable();
        break;
      case ApiKeyType.READ_WRITE:
        permissionsControl?.setValue(['read:events', 'write:events', 'read:users', 'read:config']);
        permissionsControl?.disable();
        break;
      case ApiKeyType.ADMIN:
        permissionsControl?.setValue(this.permissionOptions.map(opt => opt.value));
        permissionsControl?.disable();
        break;
      default:
        permissionsControl?.enable();
        break;
    }
  }

  // 填充表单数据
  private patchForm(apiKey: ApiKey): void {
    this.apiKeyForm.patchValue({
      name: apiKey.name,
      description: apiKey.description || '',
      type: apiKey.type,
      expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : null,
      permissions: apiKey.permissions || []
    });
  }

  // 表单提交
  onSubmit(): void {
    if (this.apiKeyForm.invalid) {
      this.markFormGroupTouched(this.apiKeyForm);
      return;
    }

    const formValue = this.apiKeyForm.value;

    if (this.isEditMode && this.apiKey) {
      const updateData: UpdateApiKeyDto = {
        name: formValue.name,
        description: formValue.description || undefined,
        type: formValue.type,
        expiresAt: formValue.expiresAt || undefined,
        permissions: formValue.permissions
      };
      this.submit.emit(updateData);
    } else {
      const createData: CreateApiKeyDto = {
        name: formValue.name,
        description: formValue.description || undefined,
        type: formValue.type,
        expiresAt: formValue.expiresAt || undefined,
        permissions: formValue.permissions
      };
      this.submit.emit(createData);
    }
  }

  // 取消操作
  onCancel(): void {
    this.cancel.emit();
  }

  // 权限复选框变更
  onPermissionChange(permission: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const permissionsControl = this.apiKeyForm.get('permissions');
    let permissions = permissionsControl?.value || [];

    if (checkbox.checked) {
      permissions = [...permissions, permission];
    } else {
      permissions = permissions.filter((p: string) => p !== permission);
    }

    permissionsControl?.setValue(permissions);
  }

  // 检查权限是否被选中
  isPermissionSelected(permission: string): boolean {
    const permissions = this.apiKeyForm.get('permissions')?.value || [];
    return permissions.includes(permission);
  }

  // 全选/取消全选权限
  toggleAllPermissions(): void {
    const permissionsControl = this.apiKeyForm.get('permissions');
    const allPermissions = this.permissionOptions.map(opt => opt.value);
    const currentPermissions = permissionsControl?.value || [];

    if (currentPermissions.length === allPermissions.length) {
      permissionsControl?.setValue([]);
    } else {
      permissionsControl?.setValue(allPermissions);
    }
  }

  // 检查是否全选
  isAllPermissionsSelected(): boolean {
    const allPermissions = this.permissionOptions.map(opt => opt.value);
    const currentPermissions = this.apiKeyForm.get('permissions')?.value || [];
    return currentPermissions.length === allPermissions.length && allPermissions.length > 0;
  }

  // 检查是否部分选中
  isSomePermissionsSelected(): boolean {
    const allPermissions = this.permissionOptions.map(opt => opt.value);
    const currentPermissions = this.apiKeyForm.get('permissions')?.value || [];
    return currentPermissions.length > 0 && currentPermissions.length < allPermissions.length;
  }

  // 清除过期时间
  clearExpiryDate(): void {
    this.apiKeyForm.get('expiresAt')?.setValue(null);
  }

  // 设置默认过期时间（1年后）
  setDefaultExpiryDate(): void {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    this.apiKeyForm.get('expiresAt')?.setValue(oneYearLater.toISOString().slice(0, 16));
  }

  // 获取最小日期时间（当前时间）
  getMinDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }

  // 获取最大日期时间（10年后）
  getMaxDateTime(): string {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    return maxDate.toISOString().slice(0, 16);
  }

  // 表单验证错误信息
  getErrorMessage(controlName: string): string {
    const control = this.apiKeyForm.get(controlName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    if (errors['required']) {
      return '此字段为必填项';
    }
    if (errors['minlength']) {
      return `最少需要 ${errors['minlength'].requiredLength} 个字符`;
    }
    if (errors['maxlength']) {
      return `最多允许 ${errors['maxlength'].requiredLength} 个字符`;
    }
    if (errors['email']) {
      return '请输入有效的邮箱地址';
    }
    if (errors['pattern']) {
      return '格式不正确';
    }

    return '输入有误';
  }

  // 标记表单组为已触摸
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // 检查表单控制是否有错误
  hasError(controlName: string): boolean {
    const control = this.apiKeyForm.get(controlName);
    return !!(control && control.errors && control.touched);
  }

  // 获取权限组的描述
  getPermissionGroupDescription(permissions: string[]): string {
    if (permissions.length === 0) return '无权限';
    if (permissions.includes('admin:all')) return '管理员权限';

    const readCount = permissions.filter(p => p.startsWith('read:')).length;
    const writeCount = permissions.filter(p => p.startsWith('write:')).length;
    const deleteCount = permissions.filter(p => p.startsWith('delete:')).length;

    const parts = [];
    if (readCount > 0) parts.push(`读取${readCount}项`);
    if (writeCount > 0) parts.push(`写入${writeCount}项`);
    if (deleteCount > 0) parts.push(`删除${deleteCount}项`);

    return parts.join('、') || '自定义权限';
  }

  // 获取选中的权限数量
  getSelectedPermissionsCount(): number {
    return (this.apiKeyForm.get('permissions')?.value || []).length;
  }

  // 获取表单标题
  getFormTitle(): string {
    return this.isEditMode ? '编辑 API Key' : '创建新的 API Key';
  }

  // 获取提交按钮文本
  getSubmitButtonText(): string {
    return this.isEditMode ? '保存修改' : '创建 API Key';
  }

  // 检查表单是否有效
  isFormValid(): boolean {
    return this.apiKeyForm.valid;
  }

  // 获取表单数据预览
  getFormDataPreview(): any {
    const formValue = this.apiKeyForm.value;
    return {
      ...formValue,
      permissions: formValue.permissions || [],
      typeDescription: this.apiTypeOptions.find(opt => opt.value === formValue.type)?.description
    };
  }

  // TrackBy 方法
  trackByValue(index: number, option: any): any {
    return option.value;
  }
}