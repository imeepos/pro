import { SetMetadata } from '@nestjs/common';

/**
 * 工作流节点元数据键
 */
export const WORKFLOW_NODE_METADATA = 'workflow:node';

/**
 * 工作流节点装饰器
 *
 * 标记一个类作为自定义工作流节点，允许在工作流系统中注册和使用
 *
 * @param nodeType - 节点类型标识符（可选，默认使用类名）
 *
 * @example
 * @WorkflowNode('CustomDataProcessor')
 * export class DataProcessorAst extends Ast {
 *   type = 'CustomDataProcessor' as const;
 *   // ... 实现
 * }
 */
export function WorkflowNode(nodeType?: string): ClassDecorator {
  return (target: any) => {
    const type = nodeType || target.name;
    SetMetadata(WORKFLOW_NODE_METADATA, type)(target);
    return target;
  };
}
