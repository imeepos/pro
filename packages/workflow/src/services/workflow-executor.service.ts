import { Injectable } from '@nestjs/common';
import { ExecutorVisitor, execute, executeAst } from '../executor';
import { Context, INode } from '../types';
import { Visitor } from '../ast';

/**
 * 工作流执行服务
 *
 * 作为访问者模式执行引擎的 NestJS 包装，提供：
 * - 单次执行：executeOnce() - 执行工作流一次迭代
 * - 完整执行：execute() - 执行直到完成或失败
 * - 自定义访问者支持
 */
@Injectable()
export class WorkflowExecutorService {
  private readonly defaultVisitor: ExecutorVisitor;

  constructor() {
    this.defaultVisitor = new ExecutorVisitor();
  }

  /**
   * 执行单次工作流迭代
   *
   * @param state - 工作流状态节点
   * @param context - 执行上下文
   * @param visitor - 可选的自定义访问者，默认使用内置 ExecutorVisitor
   * @returns 更新后的状态节点
   */
  async executeOnce<S extends INode>(
    state: S,
    context: Context = {},
    visitor?: Visitor,
  ): Promise<S> {
    return executeAst(state, visitor || this.defaultVisitor, context);
  }

  /**
   * 执行完整工作流直到结束
   *
   * 持续执行直到状态变为 'success' 或 'fail'
   *
   * @param state - 工作流状态节点
   * @param context - 执行上下文
   * @param visitor - 可选的自定义访问者
   * @returns 最终状态节点
   */
  async execute<S extends INode>(
    state: S,
    context: Context = {},
    visitor?: Visitor,
  ): Promise<S> {
    return execute(state, visitor || this.defaultVisitor, context);
  }

  /**
   * 获取默认执行访问者实例
   */
  getDefaultVisitor(): ExecutorVisitor {
    return this.defaultVisitor;
  }
}
