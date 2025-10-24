import { Injectable, SetMetadata } from '@nestjs/common';

/**
 * 工作流访问者元数据键
 */
export const WORKFLOW_VISITOR_METADATA = 'workflow:visitor';

/**
 * 工作流访问者装饰器
 *
 * 标记一个类作为自定义工作流访问者，自动注册到工作流系统中
 * 同时应用 @Injectable() 使其可被 NestJS 依赖注入
 *
 * @example
 * @WorkflowVisitor()
 * export class CustomExecutorVisitor extends ExecutorVisitor {
 *   async visitCustomNode(ast: CustomNodeAst, ctx: Context): Promise<any> {
 *     // 自定义处理逻辑
 *     return ast;
 *   }
 * }
 */
export function WorkflowVisitor(): ClassDecorator {
  return (target: any) => {
    Injectable()(target);
    SetMetadata(WORKFLOW_VISITOR_METADATA, true)(target);
    return target;
  };
}
