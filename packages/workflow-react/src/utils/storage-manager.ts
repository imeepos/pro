/**
 * 工作流本地存储和同步管理器
 * 提供本地存储、自动保存、版本管理等功能
 */

import type { WorkflowNode, WorkflowEdge, NodeBlueprint } from '../types/canvas';
// import type { WorkflowTemplate } from '../templates/workflow-templates';
import { serializeWorkflow, deserializeWorkflow } from './workflow-serializer';

export interface WorkflowProject {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  blueprints: Record<string, NodeBlueprint>;
  metadata?: {
    tags: string[];
    category: string;
    author: string;
  };
}

export interface StorageConfig {
  autoSave: boolean;
  autoSaveInterval: number; // 毫秒
  maxSavedProjects: number;
  enableCloudSync: boolean;
  cloudSyncUrl?: string;
  compressionEnabled: boolean;
}

export class StorageManager {
  private config: StorageConfig;
  private autoSaveTimer?: NodeJS.Timeout;
  private saveInProgress = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      autoSave: true,
      autoSaveInterval: 30000, // 30秒
      maxSavedProjects: 50,
      enableCloudSync: false,
      compressionEnabled: true,
      ...config
    };
  }

  /**
   * 初始化存储管理器
   */
  initialize(): void {
    this.setupAutoSave();
    this.cleanupOldProjects();
    this.migrateStorageFormat();
  }

  /**
   * 保存工作流项目
   */
  async saveProject(project: Omit<WorkflowProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (this.saveInProgress) {
      throw new Error('保存操作正在进行中，请稍后再试');
    }

    this.saveInProgress = true;

    try {
      const projectId = this.generateProjectId();
      const now = new Date().toISOString();

      const fullProject: WorkflowProject = {
        id: projectId,
        createdAt: now,
        updatedAt: now,
        ...project
      };

      // 保存到本地存储
      await this.saveToLocalStorage(fullProject);

      // 如果启用云同步，也保存到云端
      if (this.config.enableCloudSync && this.config.cloudSyncUrl) {
        try {
          await this.saveToCloud(fullProject);
        } catch (error) {
          console.warn('云同步失败:', error);
          // 不影响本地保存
        }
      }

      return projectId;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * 更新现有项目
   */
  async updateProject(projectId: string, updates: Partial<Omit<WorkflowProject, 'id' | 'createdAt'>>): Promise<void> {
    if (this.saveInProgress) {
      throw new Error('保存操作正在进行中，请稍后再试');
    }

    this.saveInProgress = true;

    try {
      const existingProject = await this.loadProject(projectId);
      if (!existingProject) {
        throw new Error('项目不存在');
      }

      const updatedProject: WorkflowProject = {
        ...existingProject,
        ...updates,
        id: projectId,
        createdAt: existingProject.createdAt,
        updatedAt: new Date().toISOString()
      };

      await this.saveToLocalStorage(updatedProject);

      if (this.config.enableCloudSync && this.config.cloudSyncUrl) {
        try {
          await this.saveToCloud(updatedProject);
        } catch (error) {
          console.warn('云同步失败:', error);
        }
      }
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * 加载工作流项目
   */
  async loadProject(projectId: string): Promise<WorkflowProject | null> {
    try {
      // 先尝试从本地存储加载
      let project = await this.loadFromLocalStorage(projectId);

      // 如果本地没有，尝试从云端加载
      if (!project && this.config.enableCloudSync && this.config.cloudSyncUrl) {
        project = await this.loadFromCloud(projectId);
        if (project) {
          // 从云端加载后，保存到本地
          await this.saveToLocalStorage(project);
        }
      }

      return project;
    } catch (error) {
      console.error('加载项目失败:', error);
      return null;
    }
  }

  /**
   * 获取所有项目列表
   */
  async getProjects(): Promise<WorkflowProject[]> {
    try {
      const localProjects = await this.getAllFromLocalStorage();

      // 如果启用云同步，合并云端项目
      if (this.config.enableCloudSync && this.config.cloudSyncUrl) {
        try {
          const cloudProjects = await this.getAllFromCloud();
          return this.mergeProjects(localProjects, cloudProjects);
        } catch (error) {
          console.warn('获取云端项目失败:', error);
          return localProjects;
        }
      }

      return localProjects;
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return [];
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.deleteFromLocalStorage(projectId);

      if (this.config.enableCloudSync && this.config.cloudSyncUrl) {
        try {
          await this.deleteFromCloud(projectId);
        } catch (error) {
          console.warn('云端删除失败:', error);
        }
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 导出项目
   */
  async exportProject(projectId: string): Promise<string> {
    const project = await this.loadProject(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      project
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入项目
   */
  async importProject(jsonData: string): Promise<string> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.project) {
        throw new Error('无效的导入数据格式');
      }

      // 生成新的项目ID以避免冲突
      const project = {
        ...importData.project,
        id: this.generateProjectId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await this.saveProject(project);
    } catch (error) {
      console.error('导入项目失败:', error);
      throw new Error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 同步到云端
   */
  async syncToCloud(): Promise<void> {
    if (!this.config.enableCloudSync || !this.config.cloudSyncUrl) {
      throw new Error('云同步未启用');
    }

    const localProjects = await this.getAllFromLocalStorage();

    for (const project of localProjects) {
      try {
        await this.saveToCloud(project);
      } catch (error) {
        console.error(`同步项目 ${project.id} 失败:`, error);
      }
    }
  }

  /**
   * 从云端同步
   */
  async syncFromCloud(): Promise<void> {
    if (!this.config.enableCloudSync || !this.config.cloudSyncUrl) {
      throw new Error('云同步未启用');
    }

    try {
      const cloudProjects = await this.getAllFromCloud();
      const localProjects = await this.getAllFromLocalStorage();

      for (const cloudProject of cloudProjects) {
        const localProject = localProjects.find(p => p.id === cloudProject.id);

        // 如果云端项目较新，则更新本地
        if (!localProject || new Date(cloudProject.updatedAt) > new Date(localProject.updatedAt)) {
          await this.saveToLocalStorage(cloudProject);
        }
      }
    } catch (error) {
      console.error('从云端同步失败:', error);
      throw error;
    }
  }

  /**
   * 设置自动保存
   */
  private setupAutoSave(): void {
    if (this.config.autoSave) {
      this.autoSaveTimer = setInterval(() => {
        this.performAutoSave();
      }, this.config.autoSaveInterval);
    }
  }

  /**
   * 执行自动保存
   */
  private async performAutoSave(): Promise<void> {
    // 这里应该从当前工作流状态获取数据
    // 实际实现中需要传入当前的工作流数据
    console.log('执行自动保存');
  }

  /**
   * 清理旧项目
   */
  private async cleanupOldProjects(): Promise<void> {
    try {
      const projects = await this.getAllFromLocalStorage();

      if (projects.length > this.config.maxSavedProjects) {
        // 按更新时间排序，删除最旧的项目
        projects.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

        const projectsToDelete = projects.slice(0, projects.length - this.config.maxSavedProjects);

        for (const project of projectsToDelete) {
          await this.deleteFromLocalStorage(project.id);
        }
      }
    } catch (error) {
      console.error('清理旧项目失败:', error);
    }
  }

  /**
   * 迁移存储格式
   */
  private migrateStorageFormat(): void {
    try {
      // 检查是否需要迁移
      const currentVersion = localStorage.getItem('workflow-storage-version');
      if (currentVersion === '1.0.0') {
        return; // 已经是最新版本
      }

      // 执行迁移逻辑
      console.log('迁移存储格式...');

      // 标记为最新版本
      localStorage.setItem('workflow-storage-version', '1.0.0');
    } catch (error) {
      console.error('存储格式迁移失败:', error);
    }
  }

  /**
   * 生成项目ID
   */
  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到本地存储
   */
  private async saveToLocalStorage(project: WorkflowProject): Promise<void> {
    const key = `workflow-project-${project.id}`;
    const data = this.config.compressionEnabled ? this.compressData(project) : project;

    localStorage.setItem(key, JSON.stringify(data));

    // 更新项目索引
    const index = this.getProjectIndex();
    index[project.id] = {
      name: project.name,
      updatedAt: project.updatedAt,
      version: project.version
    };
    localStorage.setItem('workflow-projects-index', JSON.stringify(index));
  }

  /**
   * 从本地存储加载
   */
  private async loadFromLocalStorage(projectId: string): Promise<WorkflowProject | null> {
    try {
      const key = `workflow-project-${projectId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const parsedData = JSON.parse(data);
      const project = this.config.compressionEnabled ? this.decompressData(parsedData) : parsedData;

      return project as WorkflowProject;
    } catch (error) {
      console.error('从本地存储加载失败:', error);
      return null;
    }
  }

  /**
   * 获取所有本地项目
   */
  private async getAllFromLocalStorage(): Promise<WorkflowProject[]> {
    const projects: WorkflowProject[] = [];
    const index = this.getProjectIndex();

    for (const projectId in index) {
      const project = await this.loadFromLocalStorage(projectId);
      if (project) {
        projects.push(project);
      }
    }

    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * 从本地存储删除
   */
  private async deleteFromLocalStorage(projectId: string): Promise<void> {
    localStorage.removeItem(`workflow-project-${projectId}`);

    // 更新索引
    const index = this.getProjectIndex();
    delete index[projectId];
    localStorage.setItem('workflow-projects-index', JSON.stringify(index));
  }

  /**
   * 保存到云端
   */
  private async saveToCloud(project: WorkflowProject): Promise<void> {
    if (!this.config.cloudSyncUrl) {
      throw new Error('云端URL未配置');
    }

    const response = await fetch(`${this.config.cloudSyncUrl}/projects/${project.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(project)
    });

    if (!response.ok) {
      throw new Error(`云端保存失败: ${response.statusText}`);
    }
  }

  /**
   * 从云端加载
   */
  private async loadFromCloud(projectId: string): Promise<WorkflowProject | null> {
    if (!this.config.cloudSyncUrl) {
      throw new Error('云端URL未配置');
    }

    const response = await fetch(`${this.config.cloudSyncUrl}/projects/${projectId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`云端加载失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取所有云端项目
   */
  private async getAllFromCloud(): Promise<WorkflowProject[]> {
    if (!this.config.cloudSyncUrl) {
      throw new Error('云端URL未配置');
    }

    const response = await fetch(`${this.config.cloudSyncUrl}/projects`);

    if (!response.ok) {
      throw new Error(`获取云端项目失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 从云端删除
   */
  private async deleteFromCloud(projectId: string): Promise<void> {
    if (!this.config.cloudSyncUrl) {
      throw new Error('云端URL未配置');
    }

    const response = await fetch(`${this.config.cloudSyncUrl}/projects/${projectId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`云端删除失败: ${response.statusText}`);
    }
  }

  /**
   * 合并本地和云端项目
   */
  private mergeProjects(localProjects: WorkflowProject[], cloudProjects: WorkflowProject[]): WorkflowProject[] {
    const projectMap = new Map<string, WorkflowProject>();

    // 添加本地项目
    localProjects.forEach(project => {
      projectMap.set(project.id, project);
    });

    // 合并云端项目
    cloudProjects.forEach(cloudProject => {
      const localProject = projectMap.get(cloudProject.id);

      if (!localProject || new Date(cloudProject.updatedAt) > new Date(localProject.updatedAt)) {
        projectMap.set(cloudProject.id, cloudProject);
      }
    });

    return Array.from(projectMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * 获取项目索引
   */
  private getProjectIndex(): Record<string, { name: string; updatedAt: string; version: string }> {
    try {
      const indexData = localStorage.getItem('workflow-projects-index');
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.error('获取项目索引失败:', error);
      return {};
    }
  }

  /**
   * 压缩数据（简单实现）
   */
  private compressData(data: any): any {
    // 这里可以实现真正的压缩算法
    // 暂时返回原数据
    return data;
  }

  /**
   * 解压数据（简单实现）
   */
  private decompressData(data: any): any {
    // 这里可以实现真正的解压算法
    // 暂时返回原数据
    return data;
  }

  /**
   * 销毁存储管理器
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    totalProjects: number;
    localSize: number;
    lastSyncTime?: string;
  }> {
    const projects = await this.getAllFromLocalStorage();

    // 计算本地存储大小
    let localSize = 0;
    for (const project of projects) {
      const key = `workflow-project-${project.id}`;
      const data = localStorage.getItem(key);
      if (data) {
        localSize += data.length;
      }
    }

    return {
      totalProjects: projects.length,
      localSize,
      lastSyncTime: localStorage.getItem('workflow-last-sync-time') || undefined
    };
  }
}

// 创建默认存储管理器实例
export const defaultStorageManager = new StorageManager();