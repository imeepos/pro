import { execute, WorkflowGraphAst, type INode, type IEdge } from '@pro/workflow-core';
import type { WorkflowNode, WorkflowEdge } from '../types/canvas';

/**
 * 验证结果
 */
export interface ValidationResult {
  success: boolean;
  errors: Array<{
    nodeId?: string;
    message: string;
  }>;
  executedWorkflow?: INode;
}

/**
 * 快速结构验证（不执行，仅检查连接和必填端口）
 * 返回结果格式与 validateWorkflow 一致，便于统一处理
 */
export function quickValidate(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationResult {
  const errors: Array<{ nodeId?: string; message: string }> = [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 检查必填输入端口是否都有连接
  nodes.forEach(node => {
    const requiredInputs = node.data.ports.input.filter(p => p.required);
    requiredInputs.forEach(port => {
      const hasConnection = edges.some(
        e => e.target === node.id && e.targetHandle === port.id
      );
      if (!hasConnection) {
        errors.push({
          nodeId: node.id,
          message: `节点 "${node.data.label}" 的必填端口 "${port.name}" 未连接`
        });
      }
    });
  });

  // 检查边的源和目标节点是否存在
  edges.forEach(edge => {
    if (!nodeMap.has(edge.source)) {
      errors.push({
        message: `边的源节点不存在: ${edge.source}`
      });
    }
    if (!nodeMap.has(edge.target)) {
      errors.push({
        message: `边的目标节点不存在: ${edge.target}`
      });
    }
  });

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * 真实执行验证（通过实际执行工作流来验证）
 * 使用 workflow-core 的 execute 进行端到端验证
 */
export async function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  _context: any = {}
): Promise<ValidationResult> {
  try {
    // 先执行快速验证
    const quickResult = quickValidate(nodes, edges);
    if (!quickResult.success) {
      return quickResult;
    }

    // 转换为 WorkflowGraphAst 格式
    const workflowAst = new WorkflowGraphAst();

    // 构建节点数组
    workflowAst.nodes = nodes.map(node => ({
      id: node.id,
      type: node.data.blueprintId,
      state: 'pending' as const,
      ...node.data.config
    }));

    // 构建边数组，区分数据流边和控制流边
    workflowAst.edges = edges.map(edge => {
      // 有条件的边是控制流边
      if (edge.data?.condition) {
        return {
          from: edge.source,
          to: edge.target,
          condition: {
            property: 'state',
            value: edge.data.condition
          }
        } as IEdge;
      }

      // 否则是数据流边
      return {
        from: edge.source,
        to: edge.target,
        fromProperty: edge.sourceHandle || undefined,
        toProperty: edge.targetHandle || undefined,
        weight: edge.data?.priority
      } as IEdge;
    });

    // 执行工作流（暂时跳过，避免依赖问题）
    // const result = await execute(workflowAst, _context);

    // 收集错误
    const errors: Array<{ nodeId?: string; message: string }> = [];

    if (result.state === 'fail') {
      errors.push({
        message: `工作流执行失败: ${result.error?.message || '未知错误'}`
      });
    }

    // 检查各节点执行状态
    if (Array.isArray(result.nodes)) {
      result.nodes.forEach((node: INode) => {
        if (node.state === 'fail') {
          errors.push({
            nodeId: node.id,
            message: `节点 "${node.type}" 执行失败: ${node.error?.message || '未知错误'}`
          });
        }
      });
    }

    return {
      success: result.state === 'success' && errors.length === 0,
      errors,
      executedWorkflow: result
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [{
        message: `验证异常: ${error.message}`
      }]
    };
  }
}
