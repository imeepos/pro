/**
 * 工作流后端API集成服务
 * 提供与workflow-core后端服务的完整集成
 */

export interface WorkflowExecutionRequest {
  workflow: {
    name?: string;
    nodes: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
      fromProperty?: string;
      toProperty?: string;
      condition?: any;
    }>;
  };
  config?: {
    timeout?: number;
    retryCount?: number;
    parallelism?: number;
    environment?: Record<string, string>;
  };
}

export interface WorkflowExecutionResponse {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  nodes: Array<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    result?: any;
    error?: string;
  }>;
  logs: Array<{
    timestamp: string;
    nodeId: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: Record<string, any>;
  }>;
  metrics?: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    executionTime: number;
    memoryUsage?: number;
  };
}

export interface WorkflowApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * 工作流API客户端
 */
export class WorkflowApiClient {
  private config: WorkflowApiConfig;
  private eventSource?: EventSource;
  private executionCallbacks = new Map<string, {
    onProgress?: (progress: number) => void;
    onNodeUpdate?: (nodeId: string, status: string, result?: any) => void;
    onLog?: (log: any) => void;
    onComplete?: (response: WorkflowExecutionResponse) => void;
    onError?: (error: Error) => void;
  }>();

  constructor(config: WorkflowApiConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  /**
   * 提交工作流执行请求
   */
  async submitWorkflow(request: WorkflowExecutionRequest): Promise<string> {
    const response = await this.fetch('/api/workflows/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`提交工作流失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.executionId;
  }

  /**
   * 获取工作流执行状态
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecutionResponse> {
    const response = await this.fetch(`/api/workflows/execution/${executionId}`, {
      method: 'GET',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`获取执行状态失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 取消工作流执行
   */
  async cancelExecution(executionId: string): Promise<void> {
    const response = await this.fetch(`/api/workflows/execution/${executionId}/cancel`, {
      method: 'POST',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`取消执行失败: ${response.statusText}`);
    }
  }

  /**
   * 获取执行日志
   */
  async getExecutionLogs(executionId: string, options?: {
    level?: 'info' | 'warn' | 'error' | 'debug';
    nodeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    timestamp: string;
    nodeId: string;
    level: string;
    message: string;
    metadata?: Record<string, any>;
  }>> {
    const params = new URLSearchParams();
    if (options?.level) params.append('level', options.level);
    if (options?.nodeId) params.append('nodeId', options.nodeId);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.fetch(`/api/workflows/execution/${executionId}/logs?${params}`, {
      method: 'GET',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`获取日志失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 订阅执行状态实时更新
   */
  subscribeExecution(executionId: string, callbacks: {
    onProgress?: (progress: number) => void;
    onNodeUpdate?: (nodeId: string, status: string, result?: any) => void;
    onLog?: (log: any) => void;
    onComplete?: (response: WorkflowExecutionResponse) => void;
    onError?: (error: Error) => void;
  }): void {
    // 保存回调函数
    this.executionCallbacks.set(executionId, callbacks);

    // 创建EventSource连接
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/workflows/execution/${executionId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log(`连接到执行流: ${executionId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleExecutionUpdate(executionId, data);
      } catch (error) {
        console.error('解析执行更新失败:', error);
        callbacks.onError?.(error instanceof Error ? error : new Error('解析失败'));
      }
    };

    eventSource.onerror = (error) => {
      console.error('执行流连接错误:', error);
      callbacks.onError?.(new Error('连接中断'));
      this.unsubscribeExecution(executionId);
    };

    this.eventSource = eventSource;
  }

  /**
   * 取消订阅执行状态
   */
  unsubscribeExecution(executionId: string): void {
    this.executionCallbacks.delete(executionId);

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  /**
   * 保存工作流模板
   */
  async saveTemplate(template: {
    name: string;
    description?: string;
    category: string;
    tags?: string[];
    workflow: WorkflowExecutionRequest['workflow'];
  }): Promise<string> {
    const response = await this.fetch('/api/workflows/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify(template)
    });

    if (!response.ok) {
      throw new Error(`保存模板失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.templateId;
  }

  /**
   * 获取工作流模板列表
   */
  async getTemplates(options?: {
    category?: string;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    workflow: WorkflowExecutionRequest['workflow'];
  }>> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.tags) params.append('tags', options.tags.join(','));
    if (options?.search) params.append('search', options.search);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.fetch(`/api/workflows/templates?${params}`, {
      method: 'GET',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`获取模板列表失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取节点类型定义
   */
  async getNodeTypes(): Promise<Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
    inputs: Array<{
      id: string;
      name: string;
      type: string;
      required?: boolean;
      multiple?: boolean;
    }>;
    outputs: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    configSchema?: Record<string, any>;
  }>> {
    const response = await this.fetch('/api/workflows/node-types', {
      method: 'GET',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`获取节点类型失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 验证工作流配置
   */
  async validateWorkflow(workflow: WorkflowExecutionRequest['workflow']): Promise<{
    valid: boolean;
    errors: Array<{
      nodeId: string;
      field: string;
      message: string;
    }>;
    warnings: Array<{
      nodeId: string;
      field: string;
      message: string;
    }>;
  }> {
    const response = await this.fetch('/api/workflows/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({ workflow })
    });

    if (!response.ok) {
      throw new Error(`验证工作流失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 处理执行状态更新
   */
  private handleExecutionUpdate(executionId: string, data: any): void {
    const callbacks = this.executionCallbacks.get(executionId);
    if (!callbacks) return;

    switch (data.type) {
      case 'progress':
        callbacks.onProgress?.(data.progress);
        break;

      case 'nodeUpdate':
        callbacks.onNodeUpdate?.(data.nodeId, data.status, data.result);
        break;

      case 'log':
        callbacks.onLog?.(data.log);
        break;

      case 'completed':
        callbacks.onComplete?.(data.response);
        this.unsubscribeExecution(executionId);
        break;

      case 'error':
        callbacks.onError?.(new Error(data.message));
        this.unsubscribeExecution(executionId);
        break;

      default:
        console.warn('未知的执行更新类型:', data.type);
    }
  }

  /**
   * 封装fetch请求，添加重试逻辑
   */
  private async fetch(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status >= 500 && attempt < (this.config.retryAttempts || 3)) {
        // 服务器错误，重试
        console.warn(`请求失败，重试 ${attempt}/${this.config.retryAttempts}:`, response.statusText);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.fetch(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < (this.config.retryAttempts || 3) &&
          (error instanceof Error && error.name === 'AbortError')) {
        // 超时重试
        console.warn(`请求超时，重试 ${attempt}/${this.config.retryAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.fetch(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清理所有订阅
    for (const executionId of this.executionCallbacks.keys()) {
      this.unsubscribeExecution(executionId);
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }
}

/**
 * 创建默认API客户端
 */
export function createWorkflowApiClient(config: WorkflowApiConfig): WorkflowApiClient {
  return new WorkflowApiClient(config);
}

/**
 * 前端工作流存储与后端API的适配器
 */
export class WorkflowApiAdapter {
  private apiClient: WorkflowApiClient;

  constructor(config: WorkflowApiConfig) {
    this.apiClient = new WorkflowApiClient(config);
  }

  /**
   * 将前端工作流转换为后端请求格式
   */
  private convertToBackendRequest(nodes: any[], edges: any[], config?: any): WorkflowExecutionRequest {
    const backendNodes = nodes.map(node => ({
      id: node.id,
      type: node.data.blueprintId,
      config: node.data.config || {}
    }));

    const backendEdges = edges.map(edge => {
      const backendEdge: any = {
        from: edge.source,
        to: edge.target
      };

      if (edge.sourceHandle) backendEdge.fromProperty = edge.sourceHandle;
      if (edge.targetHandle) backendEdge.toProperty = edge.targetHandle;
      if (edge.data?.condition) backendEdge.condition = { value: edge.data.condition };

      return backendEdge;
    });

    return {
      workflow: {
        nodes: backendNodes,
        edges: backendEdges
      },
      config
    };
  }

  /**
   * 执行工作流
   */
  async executeWorkflow(nodes: any[], edges: any[], config?: any, callbacks?: {
    onProgress?: (progress: number) => void;
    onNodeUpdate?: (nodeId: string, status: string, result?: any) => void;
    onLog?: (log: any) => void;
    onComplete?: (response: WorkflowExecutionResponse) => void;
    onError?: (error: Error) => void;
  }): Promise<string> {
    const request = this.convertToBackendRequest(nodes, edges, config);

    const executionId = await this.apiClient.submitWorkflow(request);

    if (callbacks) {
      this.apiClient.subscribeExecution(executionId, callbacks);
    }

    return executionId;
  }

  /**
   * 停止工作流执行
   */
  async stopExecution(executionId: string): Promise<void> {
    await this.apiClient.cancelExecution(executionId);
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecutionResponse> {
    return this.apiClient.getExecutionStatus(executionId);
  }

  /**
   * 验证工作流
   */
  async validateWorkflow(nodes: any[], edges: any[]): Promise<{
    valid: boolean;
    errors: Array<{ nodeId: string; field: string; message: string }>;
    warnings: Array<{ nodeId: string; field: string; message: string }>;
  }> {
    const request = this.convertToBackendRequest(nodes, edges);
    return this.apiClient.validateWorkflow(request.workflow);
  }

  /**
   * 获取节点类型
   */
  async getNodeTypes(): Promise<Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
    inputs: Array<{ id: string; name: string; type: string; required?: boolean; multiple?: boolean }>;
    outputs: Array<{ id: string; name: string; type: string }>;
    configSchema?: Record<string, any>;
  }>> {
    return this.apiClient.getNodeTypes();
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.apiClient.dispose();
  }
}