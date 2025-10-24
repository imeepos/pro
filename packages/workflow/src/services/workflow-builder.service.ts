import { Injectable } from '@nestjs/common';
import { WorkflowBuilder } from '../builder';
import { Ast, WorkflowGraphAst } from '../ast';
import { IEdge, INode } from '../types';

/**
 * 工作流构建服务
 *
 * 提供流式 API 构建 DAG 工作流：
 * - 添加节点（AST 或普通节点）
 * - 定义边关系（数据流）
 * - 生成 WorkflowGraphAst
 */
@Injectable()
export class WorkflowBuilderService {
  /**
   * 创建新的工作流构建器实例
   *
   * @example
   * const workflow = this.builderService
   *   .createBuilder()
   *   .addAst(node1)
   *   .addAst(node2)
   *   .addEdge({ from: node1.id, to: node2.id, fromProperty: 'output', toProperty: 'input' })
   *   .build('my-workflow');
   */
  createBuilder(): WorkflowBuilder {
    return new WorkflowBuilder();
  }

  /**
   * 快速构建工作流（便捷方法）
   *
   * @param name - 工作流名称
   * @param nodes - 节点数组
   * @param edges - 边数组
   * @returns 工作流图 AST
   */
  build(name: string, nodes: INode[], edges: IEdge[]): WorkflowGraphAst {
    const builder = new WorkflowBuilder();
    nodes.forEach((node) => builder.addNode(node));
    edges.forEach((edge) => builder.addEdge(edge));
    return builder.build(name);
  }

  /**
   * 从 AST 数组构建工作流
   *
   * @param name - 工作流名称
   * @param asts - AST 节点数组
   * @param edges - 边数组
   * @returns 工作流图 AST
   */
  buildFromAsts(name: string, asts: Ast[], edges: IEdge[]): WorkflowGraphAst {
    const builder = new WorkflowBuilder();
    asts.forEach((ast) => builder.addAst(ast));
    edges.forEach((edge) => builder.addEdge(edge));
    return builder.build(name);
  }
}
