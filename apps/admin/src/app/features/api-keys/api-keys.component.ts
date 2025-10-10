import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  expiresAt?: Date;
}

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-keys.component.html',
  styleUrls: ['./api-keys.component.scss']
})
export class ApiKeysComponent implements OnInit {
  apiKeys: ApiKey[] = [];
  isCreateModalOpen = false;
  isDeleteModalOpen = false;
  selectedKey: ApiKey | null = null;
  showCreateForm = false;
  today: string = '';

  // 新建API密钥表单
  newKey = {
    name: '',
    permissions: [] as string[],
    expiresAt: ''
  };

  availablePermissions = [
    { id: 'read', label: '读取权限', description: '查看数据' },
    { id: 'write', label: '写入权限', description: '创建和修改数据' },
    { id: 'delete', label: '删除权限', description: '删除数据' },
    { id: 'admin', label: '管理权限', description: '完全控制' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadApiKeys();
    // 设置今天的日期作为日期输入的最小值
    this.today = new Date().toISOString().split('T')[0];
  }

  private loadApiKeys(): void {
    // 模拟数据，实际应该从API获取
    this.apiKeys = [
      {
        id: '1',
        name: '生产环境密钥',
        key: 'sk_prod_1234567890abcdef',
        permissions: ['read', 'write'],
        createdAt: new Date('2024-01-15'),
        lastUsed: new Date('2024-03-10'),
        isActive: true,
        expiresAt: new Date('2025-01-15')
      },
      {
        id: '2',
        name: '测试环境密钥',
        key: 'sk_test_abcdef1234567890',
        permissions: ['read'],
        createdAt: new Date('2024-02-20'),
        lastUsed: new Date('2024-03-12'),
        isActive: true
      },
      {
        id: '3',
        name: '临时访问密钥',
        key: 'sk_temp_9876543210fedcba',
        permissions: ['read'],
        createdAt: new Date('2024-03-01'),
        isActive: false,
        expiresAt: new Date('2024-03-15')
      }
    ];
  }

  openCreateModal(): void {
    this.showCreateForm = true;
    this.newKey = {
      name: '',
      permissions: [],
      expiresAt: ''
    };
  }

  closeCreateModal(): void {
    this.showCreateForm = false;
    this.newKey = {
      name: '',
      permissions: [],
      expiresAt: ''
    };
  }

  createApiKey(): void {
    if (!this.newKey.name || this.newKey.permissions.length === 0) {
      return;
    }

    const newApiKey: ApiKey = {
      id: Date.now().toString(),
      name: this.newKey.name,
      key: `sk_${this.generateRandomKey()}`,
      permissions: this.newKey.permissions,
      createdAt: new Date(),
      isActive: true,
      expiresAt: this.newKey.expiresAt ? new Date(this.newKey.expiresAt) : undefined
    };

    this.apiKeys.unshift(newApiKey);
    this.closeCreateModal();
  }

  private generateRandomKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  toggleKeyStatus(key: ApiKey): void {
    key.isActive = !key.isActive;
  }

  copyToClipboard(key: string): void {
    navigator.clipboard.writeText(key).then(() => {
      // TODO: 显示成功提示
      console.log('API Key 已复制到剪贴板');
    });
  }

  openDeleteModal(key: ApiKey): void {
    this.selectedKey = key;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.selectedKey = null;
  }

  deleteApiKey(): void {
    if (this.selectedKey) {
      this.apiKeys = this.apiKeys.filter(key => key.id !== this.selectedKey!.id);
      this.closeDeleteModal();
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN');
  }

  getPermissionBadgeClass(permission: string): string {
    switch (permission) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'write': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-orange-100 text-orange-800';
      case 'read': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPermissionLabel(permission: string): string {
    const perm = this.availablePermissions.find(p => p.id === permission);
    return perm ? perm.label : permission;
  }

  isKeyExpired(key: ApiKey): boolean {
    return key.expiresAt ? key.expiresAt < new Date() : false;
  }

  isKeyExpiringSoon(key: ApiKey): boolean {
    if (!key.expiresAt) return false;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return key.expiresAt <= sevenDaysFromNow && key.expiresAt > new Date();
  }
}