import { toJson, fromJson, WorkflowGraphAst, type INode, type IEdge, isDataEdge, isControlEdge } from '@pro/workflow-core';
import type { WorkflowNode, WorkflowEdge, NodeBlueprint } from '../types/canvas';
import type { WorkflowTemplate } from '../templates/workflow-templates';

/**
 * 工作流序列化配置
 */
export interface SerializationConfig {
  includeMetadata?: boolean;
  compressOutput?: boolean;
  formatVersion?: string;
  encryptSensitiveData?: boolean;
}

/**
 * 工作流反序列化选项
 */
export interface DeserializationOptions {
  validateNodes?: boolean;
  autoPositionNodes?: boolean;
  createMissingBlueprints?: boolean;
  migrateConfig?: boolean;
}

/**
 * 序列化工作流为 JSON 字符串
 *
 * 将 Canvas 的 WorkflowNode/WorkflowEdge 转换为 workflow-core 的 AST 格式，
 * 然后使用官方 toJson 进行序列化
 */
export function serializeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  name?: string,
  config: SerializationConfig = {}
): string {
  const workflowAst = new WorkflowGraphAst();
  workflowAst.name = name || 'Untitled Workflow';

  // 添加元数据
  if (config.includeMetadata) {
    workflowAst.metadata = {
      formatVersion: config.formatVersion || '1.0.0',
      createdAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      categories: [...new Set(nodes.map(n => getNodeCategory(n.data.blueprintId)))]
    };
  }

  // 转换节点：WorkflowNode → INode
  workflowAst.nodes = nodes.map((node) => {
    const { id, data } = node;
    const workflowNode: INode = {
      id,
      type: data.blueprintId,
      state: 'pending' as const,
      ...data.config,
    };

    // 添加节点元数据
    if (config.includeMetadata) {
      workflowNode.metadata = {
        position: node.position,
        label: data.label,
        validation: data.validation
      };
    }

    return workflowNode;
  });

  // 转换边：WorkflowEdge → IEdge
  workflowAst.edges = edges.map((edge) => {
    if (edge.data?.condition) {
      // 控制边
      const controlEdge: IEdge = {
        from: edge.source,
        to: edge.target,
        condition: {
          property: 'default',
          value: edge.data.condition,
        },
      };

      // if (config.includeMetadata) {
      //   controlEdge.metadata = {
      //     id: edge.id,
      //     type: edge.type,
      //     validation: edge.data?.validation
      //   };
      // }

      return controlEdge;
    }

    // 数据边
    const dataEdge: IEdge = {
      from: edge.source,
      to: edge.target,
      fromProperty: edge.sourceHandle,
      toProperty: edge.targetHandle,
      weight: edge.data?.priority,
    };

    // if (config.includeMetadata) {
    //   dataEdge.metadata = {
    //     id: edge.id,
    //     type: edge.type,
    //     validation: edge.data?.validation
    //   };
    // }

    return dataEdge;
  });

  // 使用 workflow-core 的 toJson 进行序列化
  const jsonString = JSON.stringify(toJson(workflowAst), null, config.compressOutput ? 0 : 2);

  // 加密敏感数据
  if (config.encryptSensitiveData) {
    return encryptSensitiveFields(jsonString);
  }

  return jsonString;
}

/**
 * 反序列化工作流从 JSON 字符串
 *
 * 使用官方 fromJson 反序列化，然后转换为 Canvas 的 WorkflowNode/WorkflowEdge 格式
 */
export function deserializeWorkflow(
  json: string,
  blueprints: Record<string, NodeBlueprint>,
  options: DeserializationOptions = {}
): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  name?: string;
  metadata?: any;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 解密敏感数据
  const processedJson = isEncrypted(json) ? decryptSensitiveFields(json) : json;

  // 使用 workflow-core 的 fromJson 反序列化
  let workflowAst: WorkflowGraphAst;
  try {
    workflowAst = fromJson<WorkflowGraphAst>(JSON.parse(processedJson));
  } catch (error) {
    throw new Error(`工作流反序列化失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 处理旧版本迁移
  if (options.migrateConfig) {
    workflowAst = migrateWorkflowFormat(workflowAst, warnings);
  }

  // 转换节点：INode → WorkflowNode
  const nodes: WorkflowNode[] = workflowAst.nodes.map((node: INode, index: number) => {
    const blueprint = blueprints[node.type];
    const { type, id, state, error, metadata: nodeMetadata, ...config } = node;

    // 验证节点
    if (options.validateNodes && !blueprint) {
      warnings.push(`未知的节点类型: ${type}，将创建占位符节点`);

      if (options.createMissingBlueprints) {
        // 创建占位符蓝图
        blueprints[type] = createPlaceholderBlueprint(type);
      }
    }

    const finalBlueprint = blueprints[type] || createPlaceholderBlueprint(type);

    // 确定节点位置
    let position: { x: number; y: number };
    if (options.autoPositionNodes && nodeMetadata?.position) {
      position = nodeMetadata.position;
    } else {
      position = {
        x: 100 + (index % 5) * 200,
        y: 100 + Math.floor(index / 5) * 150
      };
    }

    return {
      id,
      type: 'workflow',
      position,
      data: {
        label: nodeMetadata?.label || finalBlueprint?.name || type,
        blueprintId: type,
        config: config || {},
        ports: finalBlueprint?.ports || { input: [], output: [] },
        validation: {
          status: state === 'success' ? 'valid' : state === 'fail' ? 'error' : 'valid',
          messages: error ? [error.message] : [],
        },
      },
    } as WorkflowNode;
  });

  // 转换边：IEdge → WorkflowEdge
  const edges: WorkflowEdge[] = workflowAst.edges.map((edge: IEdge) => {
    if (isControlEdge(edge)) {
      // 控制边
      const edgeId = `${edge.from}__${edge.to}`;
      return {
        id: edgeId,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        data: {
          condition: edge.condition?.value,
        },
      } as WorkflowEdge;
    }

    if (isDataEdge(edge)) {
      // 数据边
      const edgeId = `${edge.from}__${edge.to}`;
      return {
        id: edgeId,
        source: edge.from,
        target: edge.to,
        sourceHandle: edge.fromProperty,
        targetHandle: edge.toProperty,
        type: 'smoothstep',
        data: {
          priority: edge.weight,
        },
      } as WorkflowEdge;
    }

    // 此分支不应到达（isControlEdge 和 isDataEdge 涵盖所有情况）
    throw new Error(`未知的边类型: ${JSON.stringify(edge)}`);
  });

  return {
    nodes,
    edges,
    name: workflowAst.name,
    metadata: workflowAst.metadata,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * 序列化工作流模板
 */
export function serializeTemplate(template: WorkflowTemplate): string {
  const templateData = {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags,
    blueprint: template.blueprint,
    version: '1.0.0',
    createdAt: new Date().toISOString()
  };

  return JSON.stringify(templateData, null, 2);
}

/**
 * 反序列化工作流模板
 */
export function deserializeTemplate(json: string): WorkflowTemplate {
  const data = JSON.parse(json);

  // 验证模板格式
  if (!data.id || !data.name || !data.blueprint) {
    throw new Error('无效的模板格式');
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    category: data.category || 'data-processing',
    tags: data.tags || [],
    blueprint: data.blueprint
  };
}

/**
 * 从模板创建工作流
 */
export function createWorkflowFromTemplate(
  template: WorkflowTemplate,
  blueprintOverrides?: Record<string, NodeBlueprint>
): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const nodes: WorkflowNode[] = template.blueprint.nodes.map((nodeData) => {
    const blueprint = blueprintOverrides?.[nodeData.blueprintId];

    return {
      id: nodeData.id,
      type: 'workflow',
      position: nodeData.position,
      data: {
        label: blueprint?.name || nodeData.blueprintId,
        blueprintId: nodeData.blueprintId,
        config: nodeData.config,
        ports: blueprint?.ports || { input: [], output: [] },
        validation: {
          status: 'valid' as const,
          messages: []
        }
      }
    };
  });

  const edges: WorkflowEdge[] = template.blueprint.edges.map((edgeData) => ({
    id: `${edgeData.source}__${edgeData.target}`,
    source: edgeData.source,
    target: edgeData.target,
    sourceHandle: edgeData.sourceHandle,
    targetHandle: edgeData.targetHandle,
    type: 'smoothstep',
    data: edgeData.data || {}
  }));

  return { nodes, edges };
}

// 辅助函数

/**
 * 获取节点分类
 */
function getNodeCategory(blueprintId: string): string {
  // 这里可以根据 blueprintId 查找对应的分类
  // 暂时返回默认分类
  const categoryMap: Record<string, string> = {
    'FileReaderAst': '数据输入',
    'ApiClientAst': '数据输入',
    'DataTransformerAst': '数据处理',
    'DataValidatorAst': '数据处理',
    'DataAggregatorAst': '数据分析',
    'PlaywrightCrawlerAst': '网络爬虫',
    'HtmlExtractorAst': '网络爬虫',
    'DatabaseWriterAst': '数据输出',
    'EmailNotifierAst': '通知输出',
    'ConditionalBranchAst': '控制流程',
    'LoopIteratorAst': '控制流程',
    'DelayAst': '控制流程'
  };

  return categoryMap[blueprintId] || '通用';
}

/**
 * 加密敏感字段
 */
function encryptSensitiveFields(json: string): string {
  // 简单的敏感字段加密实现
  // 在生产环境中应该使用更安全的加密方法
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  let encryptedJson = json;

  try {
    const data = JSON.parse(json);

    const encryptValue = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = `encrypted:${Buffer.from(obj[key]).toString('base64')}`;
        } else if (typeof obj[key] === 'object') {
          encryptValue(obj[key]);
        }
      }
    };

    encryptValue(data);
    encryptedJson = JSON.stringify(data);
  } catch (error) {
    // 加密失败，返回原始 JSON
    console.warn('加密敏感字段失败:', error);
  }

  return encryptedJson;
}

/**
 * 解密敏感字段
 */
function decryptSensitiveFields(json: string): string {
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  let decryptedJson = json;

  try {
    const data = JSON.parse(json);

    const decryptValue = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          if (typeof obj[key] === 'string' && obj[key].startsWith('encrypted:')) {
            const encrypted = obj[key].substring(10);
            obj[key] = Buffer.from(encrypted, 'base64').toString('utf-8');
          }
        } else if (typeof obj[key] === 'object') {
          decryptValue(obj[key]);
        }
      }
    };

    decryptValue(data);
    decryptedJson = JSON.stringify(data);
  } catch (error) {
    // 解密失败，返回原始 JSON
    console.warn('解密敏感字段失败:', error);
  }

  return decryptedJson;
}

/**
 * 检查是否已加密
 */
function isEncrypted(json: string): boolean {
  return json.includes('encrypted:');
}

/**
 * 创建占位符蓝图
 */
function createPlaceholderBlueprint(nodeType: string): NodeBlueprint {
  return {
    id: nodeType,
    name: nodeType,
    category: '未知',
    description: `未知节点类型: ${nodeType}`,
    ports: {
      input: [],
      output: []
    }
  };
}

/**
 * 迁移工作流格式
 */
function migrateWorkflowFormat(workflowAst: WorkflowGraphAst, warnings: string[]): WorkflowGraphAst {
  // 这里可以实现版本迁移逻辑
  // 例如：将旧版本的节点配置转换为新版本格式

  if (!workflowAst.metadata) {
    warnings.push('工作流缺少元数据，将添加默认元数据');
    workflowAst.metadata = {
      formatVersion: '1.0.0',
      createdAt: new Date().toISOString()
    };
  }

  return workflowAst;
}
