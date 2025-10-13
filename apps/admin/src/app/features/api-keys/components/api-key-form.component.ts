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

    // 避免在表单初始化期间触发权限更新
    if (this.apiKeyForm.pristine && !permissionsControl?.dirty) {
      console.log('🔍 [API Key Form] 跳过权限更新，表单尚未被用户修改');
      return;
    }

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

    console.log('🔍 [API Key Form] 权限已根据类型更新:', { type, permissions: permissionsControl?.value });
  }

  // 填充表单数据
  private patchForm(apiKey: ApiKey): void {
    console.log('🔍 [API Key Form] 填充表单数据，API Key:', apiKey);

    // 确保权限数组有默认值
    const permissions = apiKey.permissions || [];

    const formData = {
      name: apiKey.name || '',
      description: apiKey.description || '',
      type: apiKey.type || ApiKeyType.READ_ONLY,
      expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : null,
      permissions: permissions
    };

    console.log('🔍 [API Key Form] 准备填充的表单数据:', formData);

    this.apiKeyForm.patchValue(formData);

    // 避免立即触发权限更新，防止意外的表单值变化
    // 权限的设置会由用户交互或表单的 valueChanges 监听器处理
    console.log('🔍 [API Key Form] 表单填充完成，当前值:', this.apiKeyForm.value);
  }

  // 表单提交
  onSubmit(): void {
    console.log('🔍 [API Key Form] 表单提交开始');
    console.log('🔍 [API Key Form] 编辑模式:', this.isEditMode);
    console.log('🔍 [API Key Form] 表单有效性:', this.apiKeyForm.valid);
    console.log('🔍 [API Key Form] 表单原始值:', this.apiKeyForm.value);
    console.log('🔍 [API Key Form] 原始API Key数据:', this.apiKey);
    console.log('🔍 [API Key Form] 当前加载状态:', this.loading);

    // 防止重复提交
    if (this.loading) {
      console.warn('⚠️ [API Key Form] 表单正在提交中，忽略重复提交');
      return;
    }

    if (this.apiKeyForm.invalid) {
      console.warn('⚠️ [API Key Form] 表单验证失败，标记为已触摸');
      this.markFormGroupTouched(this.apiKeyForm);
      return;
    }

    const formValue = this.apiKeyForm.value;
    console.log('🔍 [API Key Form] 处理后的表单值:', formValue);

    // 清理表单数据，移除意外的字段
    const cleanedFormValue = this.cleanFormData(formValue);
    console.log('🧹 [API Key Form] 清理后的表单值:', cleanedFormValue);

    // 确保类型字段正确映射
    let typeValue = cleanedFormValue.type;
    if (typeof typeValue === 'string') {
      // 如果是字符串形式，确保转换为正确的枚举值
      if (typeValue === 'admin') {
        typeValue = ApiKeyType.ADMIN;
      } else if (typeValue === 'read_write') {
        typeValue = ApiKeyType.READ_WRITE;
      } else if (typeValue === 'read_only') {
        typeValue = ApiKeyType.READ_ONLY;
      }
    }

    console.log('🔄 [API Key Form] 类型转换结果:', {
      original: cleanedFormValue.type,
      converted: typeValue,
      convertedType: typeof typeValue
    });

    // 处理过期时间：明确区分永久过期（null）和未设置（undefined）
    let expiresAt: string | null | undefined;
    if (cleanedFormValue.expiresAt === null || cleanedFormValue.expiresAt === '') {
      // 用户选择永久过期或清空字段
      expiresAt = null;
      console.log('🔍 [API Key Form] 设置永久过期时间');
    } else if (cleanedFormValue.expiresAt) {
      // 用户设置了具体的过期时间
      expiresAt = cleanedFormValue.expiresAt;
      console.log('🔍 [API Key Form] 设置具体过期时间:', expiresAt);
    } else {
      // 未设置过期时间（编辑时可能保持原值）
      expiresAt = undefined;
      console.log('🔍 [API Key Form] 过期时间未设置');
    }

    if (this.isEditMode && this.apiKey) {
      const updateData: UpdateApiKeyDto = this.createUpdateData(cleanedFormValue, typeValue, expiresAt);
      console.log('✅ [API Key Form] 准备发送更新数据:', {
        id: this.apiKey.id,
        currentType: this.apiKey.type,
        newType: updateData.type,
        updateData
      });
      this.submit.emit(updateData);
    } else {
      const createData: CreateApiKeyDto = this.createCreateData(cleanedFormValue, typeValue, expiresAt);
      console.log('✅ [API Key Form] 发送创建数据:', createData);
      this.submit.emit(createData);
    }
  }

  // 清理表单数据，移除意外添加的字段
  private cleanFormData(formValue: any): any {
    const allowedFields = ['name', 'description', 'type', 'expiresAt', 'permissions'];
    const cleaned: any = {};

    for (const field of allowedFields) {
      if (formValue.hasOwnProperty(field)) {
        cleaned[field] = formValue[field];
      }
    }

    // 移除所有可能的意外字段，如 isTrusted 等
    Object.keys(formValue).forEach(key => {
      if (!allowedFields.includes(key)) {
        console.warn('⚠️ [API Key Form] 移除意外字段:', key, formValue[key]);
      }
    });

    return cleaned;
  }

  // 创建更新数据对象
  private createUpdateData(formValue: any, typeValue: ApiKeyType, expiresAt: string | null | undefined): UpdateApiKeyDto {
    return {
      name: formValue.name?.trim() || '',
      description: formValue.description?.trim() || undefined,
      type: typeValue,
      expiresAt: expiresAt,
      permissions: formValue.permissions || []
    };
  }

  // 创建数据对象
  private createCreateData(formValue: any, typeValue: ApiKeyType, expiresAt: string | null | undefined): CreateApiKeyDto {
    return {
      name: formValue.name?.trim() || '',
      description: formValue.description?.trim() || undefined,
      type: typeValue,
      expiresAt: expiresAt,
      permissions: formValue.permissions || []
    };
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