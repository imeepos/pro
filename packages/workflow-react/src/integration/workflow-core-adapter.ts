/**
 * 适配器：将 ReactFlow 状态转换为 @pro/workflow-core 格式
 * 并调用编译器进行验证
 */

import type { WorkflowNode, WorkflowEdge } from '@/types/canvas';

/**
 * workflow-core 的画布模型接口（根据实际情况调整）
 */
export interface WorkflowCoreCanvas {
  nodes: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    ports: {
      input: Array<{ id: string; name: string; kind: string; dataType?: string }>;
      output: Array<{ id: string; name: string; kind: string; dataType?: string }>;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourcePort?: string;
    targetPort?: string;
    condition?: string;
  }>;
}

/**
 * 将 ReactFlow 节点和边转换为 workflow-core 格式
 */
export function toWorkflowCoreFormat(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowCoreCanvas {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.blueprintId,
      config: node.data.config,
      ports: {
        input: node.data.ports.input.map((p) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          dataType: p.dataType,
        })),
        output: node.data.ports.output.map((p) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          dataType: p.dataType,
        })),
      },
    })),
    edges: edges.map((edge: WorkflowEdge) => ({
      id: (edge as any).id,
      source: (edge as any).source,
      target: (edge as any).target,
      sourcePort: (edge as any).sourceHandle ?? undefined,
      targetPort: (edge as any).targetHandle ?? undefined,
      condition: edge.data?.condition,
    })),
  };
}

/**
 * 调用 workflow-core 编译器进行验证
 * （需要根据实际的 workflow-core API 调整）
 */
export async function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  try {
    // 示例：假设 workflow-core 导出了 WorkflowCompiler
    // const { WorkflowCompiler } = await import('@pro/workflow-core');
    // const compiler = new WorkflowCompiler();
    // const canvas = toWorkflowCoreFormat(nodes, edges);
    // const result = compiler.compile(canvas);
    // return result;

    // 临时占位实现
    const canvas = toWorkflowCoreFormat(nodes, edges);
    console.log('Validating workflow:', canvas);

    // 简单的客户端验证
    const errors: Array<{ nodeId?: string; edgeId?: string; message: string }> = [];

    // 检查必填端口
    nodes.forEach((node) => {
      const requiredInputs = node.data.ports.input.filter((p) => p.required);
      requiredInputs.forEach((port) => {
        const hasConnection = edges.some((e) => (e as any).target === node.id && (e as any).targetHandle === port.id);
        if (!hasConnection) {
          errors.push({
            nodeId: node.id,
            message: `节点 "${node.data.label}" 的必填端口 "${port.name}" 未连接`,
          });
        }
      });
    });

    // 检查类型匹配（简化版）
    edges.forEach((edge: WorkflowEdge) => {
      const edgeTyped = edge as any;
      const sourceNode = nodes.find((n) => n.id === edgeTyped.source);
      const targetNode = nodes.find((n) => n.id === edgeTyped.target);

      if (!sourceNode || !targetNode) {
        errors.push({
          edgeId: edgeTyped.id,
          message: '连线的源节点或目标节点不存在',
        });
        return;
      }

      const sourcePort = sourceNode.data.ports.output.find((p) => p.id === edgeTyped.sourceHandle);
      const targetPort = targetNode.data.ports.input.find((p) => p.id === edgeTyped.targetHandle);

      if (sourcePort && targetPort && sourcePort.dataType && targetPort.dataType) {
        if (sourcePort.dataType !== targetPort.dataType) {
          errors.push({
            edgeId: edgeTyped.id,
            message: `类型不匹配：${sourcePort.dataType} -> ${targetPort.dataType}`,
          });
        }
      }
    });

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      errors: [{ message: `验证失败: ${error}` }],
    };
  }
}

/**
 * 从 workflow-core 格式导入到 ReactFlow
 */
export function fromWorkflowCoreFormat(canvas: WorkflowCoreCanvas): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  return {
    nodes: canvas.nodes.map((node, index) => ({
      id: node.id,
      type: 'workflow',
      position: { x: 100 + index * 200, y: 100 }, // 临时布局
      data: {
        label: node.type,
        blueprintId: node.type,
        config: node.config,
        ports: {
          input: node.ports.input.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind as 'data' | 'control',
            dataType: p.dataType,
          })),
          output: node.ports.output.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind as 'data' | 'control',
            dataType: p.dataType,
          })),
        },
      },
    })),
    edges: canvas.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourcePort,
      targetHandle: edge.targetPort,
      type: 'smoothstep',
      data: {
        condition: edge.condition,
      },
    })),
  };
}
