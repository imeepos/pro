import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowScheduler } from '../execution/scheduler';
import { createWorkflowGraphAst, Ast } from '../ast';
import { INode, IEdge } from '../types';
import * as executor from '../executor';
import { Node, Input, Output } from '../decorator';

@Node()
class TestTaskAst extends Ast {
  type = 'TestTaskAst';
  @Input() inputValue?: any;
  @Input() input?: any;
  @Input() valueA?: any;
  @Input() valueB?: any;
  @Output() output?: any;
  @Output() value?: any;
  @Output() result?: any;
  shouldProceed?: boolean;
  pathA?: boolean;
  pathB?: boolean;
  approved?: boolean;
  needsReview?: boolean;
}

function createTaskNode(
  id: string,
  state: 'pending' | 'running' | 'success' | 'fail' = 'pending',
  data?: any
): INode {
  return {
    id,
    state,
    type: 'TestTaskAst',
    ...data,
  };
}

describe('WorkflowScheduler - 集成测试', () => {
  let scheduler: WorkflowScheduler;
  let executeAstSpy: any;

  beforeEach(() => {
    scheduler = new WorkflowScheduler();
    executeAstSpy = vi.spyOn(executor, 'executeAst');
    vi.clearAllMocks();
  });

  describe('基础工作流执行', () => {
    it('执行简单的线性工作流 (A → B → C)', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({ name: 'linear', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.state).toBe('running');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('pending');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('running');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('pending');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
    });

    it('执行并行工作流 (A → B, A → C)', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({ name: 'parallel', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.state).toBe('running');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
    });

    it('执行 DAG 工作流 (A → B → D, A → C → D)', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({ name: 'dag', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.state).toBe('running');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('running');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'D')?.state).toBe('success');
    });
  });

  describe('状态转换', () => {
    it('正常状态转换: pending → running → success', async () => {
      const nodes: INode[] = [createTaskNode('A')];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({ name: 'normal', nodes, edges });

      expect(ast.state).toBe('pending');

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      expect(result.nodes[0].state).toBe('success');
    });

    it('失败状态转换: pending → running → fail', async () => {
      const nodes: INode[] = [createTaskNode('A')];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'fail',
        error: new Error('执行失败'),
      }));

      const ast = createWorkflowGraphAst({ name: 'fail', nodes, edges });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('fail');
      expect(result.nodes[0].state).toBe('fail');
    });

    it('节点失败后工作流状态为 fail', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
      ];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        return { ...node, state: 'fail', error: new Error('节点失败') };
      });

      const ast = createWorkflowGraphAst({ name: 'failWorkflow', nodes, edges });

      const result = await scheduler.schedule(ast, {});
      expect(result.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('fail');
    });

    it('不再调度已完成的工作流 (success)', async () => {
      const nodes: INode[] = [createTaskNode('A', 'success')];
      const edges: IEdge[] = [];

      const ast = createWorkflowGraphAst({
        name: 'completed',
        nodes,
        edges,
        state: 'success',
      });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      expect(executeAstSpy).not.toHaveBeenCalled();
    });

    it('不再调度已失败的工作流 (fail)', async () => {
      const nodes: INode[] = [createTaskNode('A', 'fail')];
      const edges: IEdge[] = [];

      const ast = createWorkflowGraphAst({
        name: 'failed',
        nodes,
        edges,
        state: 'fail',
      });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('fail');
      expect(executeAstSpy).not.toHaveBeenCalled();
    });
  });

  describe('条件边', () => {
    interface TaskNode extends INode {
      shouldProceed?: boolean;
      pathA?: boolean;
      pathB?: boolean;
    }

    it('条件满足时执行分支', async () => {
      const nodes: TaskNode[] = [
        createTaskNode('A', 'pending', { shouldProceed: undefined }),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        {
          from: 'B',
          to: 'C',
          condition: { property: 'shouldProceed', value: true },
        },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'B') {
          return { ...node, state: 'success', shouldProceed: true };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'conditional', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');

      result = await scheduler.schedule(result, {});
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
    });

    it('条件不满足时跳过分支', async () => {
      const nodes: TaskNode[] = [
        createTaskNode('A', 'pending', { shouldProceed: undefined }),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        {
          from: 'B',
          to: 'C',
          condition: { property: 'shouldProceed', value: true },
        },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'B') {
          return { ...node, state: 'success', shouldProceed: false };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'skipBranch', nodes, edges });

      let result = await scheduler.schedule(ast, {});

      while (result.state === 'running') {
        result = await scheduler.schedule(result, {});
      }

      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
    });

    it('复杂的条件分支组合 (A → B if pathA, A → C if pathB)', async () => {
      const nodes: TaskNode[] = [
        createTaskNode('A', 'pending', { pathA: undefined, pathB: undefined }),
        createTaskNode('B'),
        createTaskNode('C'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        {
          from: 'A',
          to: 'B',
          condition: { property: 'pathA', value: true },
        },
        {
          from: 'A',
          to: 'C',
          condition: { property: 'pathB', value: true },
        },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', pathA: true, pathB: false };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'complexBranch', nodes, edges });

      let result = await scheduler.schedule(ast, {});

      while (result.state === 'running') {
        result = await scheduler.schedule(result, {});
      }

      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'D')?.state).toBe('success');
    });
  });

  describe('上下文初始化', () => {
    it('首次执行时从 context 初始化输入节点', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [{ from: 'A', to: 'B' }];

      const context = {
        'A.inputValue': 42,
      };

      let capturedNode: INode | null = null;
      executeAstSpy.mockImplementation(async (node: INode) => {
        capturedNode = node;
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'init', nodes, edges });

      await scheduler.schedule(ast, context);

      expect(capturedNode).not.toBeNull();
      expect((capturedNode as any)?.inputValue).toBe(42);
    });

    it('后续执行不重复初始化', async () => {
      const nodes: INode[] = [
        createTaskNode('A', 'success'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [{ from: 'A', to: 'B' }];

      const context = {
        'B.inputValue': 100,
      };

      let capturedNode: INode | null = null;
      executeAstSpy.mockImplementation(async (node: INode) => {
        capturedNode = node;
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({
        name: 'noReinit',
        nodes,
        edges,
        state: 'running',
      });

      await scheduler.schedule(ast, context);

      expect((capturedNode as any)?.inputValue).toBeUndefined();
    });
  });

  describe('增量执行', () => {
    it('工作流部分完成后继续执行', async () => {
      const nodes: INode[] = [
        createTaskNode('A', 'success'),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({
        name: 'resume',
        nodes,
        edges,
        state: 'running',
      });

      let result = await scheduler.schedule(ast, {});
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('pending');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
    });

    it('running 状态的工作流继续调度', async () => {
      const nodes: INode[] = [
        createTaskNode('A', 'success'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [{ from: 'A', to: 'B' }];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({
        name: 'continue',
        nodes,
        edges,
        state: 'running',
      });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
    });
  });

  describe('数据流', () => {
    interface DataNode extends INode {
      input?: any;
      output?: any;
      value?: any;
    }

    it('节点间的数据传递', async () => {
      const nodes: DataNode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [{ from: 'A', to: 'B' }];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', output: 'data from A' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'dataFlow', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');

      let capturedNodeB: INode | null = null;
      executeAstSpy.mockImplementation(async (node: INode) => {
        capturedNodeB = node;
        return { ...node, state: 'success' };
      });

      result = await scheduler.schedule(result, {});

      expect(capturedNodeB).not.toBeNull();
      expect((capturedNodeB as any)?.output).toBe('data from A');
    });

    it('属性级映射 (fromProperty → toProperty)', async () => {
      const nodes: DataNode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [
        {
          from: 'A',
          to: 'B',
          fromProperty: 'output',
          toProperty: 'input',
        },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', output: 'mapped value' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'propertyMap', nodes, edges });

      let result = await scheduler.schedule(ast, {});

      let capturedNodeB: INode | null = null;
      executeAstSpy.mockImplementation(async (node: INode) => {
        capturedNodeB = node;
        return { ...node, state: 'success' };
      });

      result = await scheduler.schedule(result, {});

      expect(capturedNodeB).not.toBeNull();
      expect((capturedNodeB as any)?.input).toBe('mapped value');
      expect((capturedNodeB as any)?.output).toBeUndefined();
    });

    it('多源数据汇聚到一个节点', async () => {
      const nodes: DataNode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'C', fromProperty: 'value', toProperty: 'valueA' },
        { from: 'B', to: 'C', fromProperty: 'value', toProperty: 'valueB' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', value: 10 };
        }
        if (node.id === 'B') {
          return { ...node, state: 'success', value: 20 };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'converge', nodes, edges });

      let result = await scheduler.schedule(ast, {});

      let capturedNodeC: INode | null = null;
      executeAstSpy.mockImplementation(async (node: INode) => {
        capturedNodeC = node;
        return { ...node, state: 'success' };
      });

      result = await scheduler.schedule(result, {});

      expect(capturedNodeC).not.toBeNull();
      expect((capturedNodeC as any)?.valueA).toBe(10);
      expect((capturedNodeC as any)?.valueB).toBe(20);
    });
  });

  describe('错误处理', () => {
    it('节点执行失败的处理', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
      ];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        return { ...node, state: 'fail', error: new Error('节点 A 失败') };
      });

      const ast = createWorkflowGraphAst({ name: 'handleError', nodes, edges });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('fail');
    });

    it('失败节点不阻塞独立分支', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
      ];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'fail' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({
        name: 'isolatedFailure',
        nodes,
        edges,
      });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
    });

    it('部分分支失败但整体工作流标记为失败', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
      ];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'B') {
          return { ...node, state: 'fail' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({
        name: 'partialFailure',
        nodes,
        edges,
      });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'B')?.state).toBe('fail');
      expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
    });
  });

  describe('多输入数组汇聚', () => {
    it('多输入数组汇聚: A|B|C → D with weight-based ordering', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'D', fromProperty: 'output', toProperty: 'results', weight: 2 },
        { from: 'B', to: 'D', fromProperty: 'output', toProperty: 'results', weight: 0 },
        { from: 'C', to: 'D', fromProperty: 'output', toProperty: 'results', weight: 1 },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', output: 'value-A' };
        }
        if (node.id === 'B') {
          return { ...node, state: 'success', output: 'value-B' };
        }
        if (node.id === 'C') {
          return { ...node, state: 'success', output: 'value-C' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({
        name: 'multiInputAggregation',
        nodes,
        edges,
      });

      let result: any = await scheduler.schedule(ast, {});
      result = await scheduler.schedule(result, {});
      result = await scheduler.schedule(result, {});

      expect(result.state).toBe('success');
      expect(result.nodes.find((n: INode) => n.id === 'A')?.state).toBe('success');
      expect(result.nodes.find((n: INode) => n.id === 'B')?.state).toBe('success');
      expect(result.nodes.find((n: INode) => n.id === 'C')?.state).toBe('success');
      expect(result.nodes.find((n: INode) => n.id === 'D')?.state).toBe('success');
    });

    it('多输入数组汇聚 - 按权重正确排序', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'D', fromProperty: 'output', toProperty: 'items', weight: 10 },
        { from: 'B', to: 'D', fromProperty: 'output', toProperty: 'items', weight: -5 },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'A') {
          return { ...node, state: 'success', output: 'A' };
        }
        if (node.id === 'B') {
          return { ...node, state: 'success', output: 'B' };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({
        name: 'weightOrdering',
        nodes,
        edges,
      });

      let result: any = await scheduler.schedule(ast, {});
      result = await scheduler.schedule(result, {});
      result = await scheduler.schedule(result, {});

      expect(result.state).toBe('success');
    });

    it('多输入数组汇聚 - D 在 A、B、C 全部成功后才执行', async () => {
      const executionLog: string[] = [];

      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('C'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'D' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        executionLog.push(`exec:${node.id}`);
        return { ...node, state: 'success', value: node.id };
      });

      const ast = createWorkflowGraphAst({
        name: 'convergence',
        nodes,
        edges,
      });

      let result: any = await scheduler.schedule(ast, {});
      expect(result.state).toBe('running');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');

      const dExecution = executionLog.filter(log => log.includes(':D'));
      expect(dExecution.length).toBeGreaterThan(0);
    });

    it('多输入数组汇聚 - 源节点失败时工作流状态为失败', async () => {
      const nodes: INode[] = [
        createTaskNode('A'),
        createTaskNode('B'),
        createTaskNode('D'),
      ];
      const edges: IEdge[] = [
        { from: 'A', to: 'D' },
        { from: 'B', to: 'D' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'B') {
          return { ...node, state: 'fail', error: new Error('source failed') };
        }
        return { ...node, state: 'success', value: node.id };
      });

      const ast = createWorkflowGraphAst({
        name: 'failOnSource',
        nodes,
        edges,
      });

      let result: any = await scheduler.schedule(ast, {});
      result = await scheduler.schedule(result, {});
      result = await scheduler.schedule(result, {});

      const nodeB = result.nodes.find((n: INode) => n.id === 'B');
      expect(nodeB?.state).toBe('fail');
    });
  });

  describe('复杂场景', () => {
    interface ComplexNode extends INode {
      approved?: boolean;
      needsReview?: boolean;
      result?: any;
      value?: number;
    }

    it('多层 DAG 与条件分支的组合', async () => {
      const nodes: ComplexNode[] = [
        createTaskNode('start'),
        createTaskNode('validate'),
        createTaskNode('process'),
        createTaskNode('review'),
        createTaskNode('end'),
      ];
      const edges: IEdge[] = [
        { from: 'start', to: 'validate' },
        {
          from: 'validate',
          to: 'process',
          condition: { property: 'approved', value: true },
        },
        {
          from: 'validate',
          to: 'review',
          condition: { property: 'needsReview', value: true },
        },
        { from: 'process', to: 'end' },
        { from: 'review', to: 'end' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.id === 'start') {
          return { ...node, state: 'success' };
        }
        if (node.id === 'validate') {
          return {
            ...node,
            state: 'success',
            approved: true,
            needsReview: false,
          };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'complex', nodes, edges });

      let result = ast;
      while (result.state !== 'success' && result.state !== 'fail') {
        result = await scheduler.schedule(result, {});
      }

      expect(result.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'start')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'validate')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'process')?.state).toBe('success');
      expect(result.nodes.find(n => n.id === 'end')?.state).toBe('success');
    });

    it('并行执行多个独立工作流', async () => {
      const nodes: INode[] = [
        createTaskNode('workflowA-1'),
        createTaskNode('workflowA-2'),
        createTaskNode('workflowB-1'),
        createTaskNode('workflowB-2'),
      ];
      const edges: IEdge[] = [
        { from: 'workflowA-1', to: 'workflowA-2' },
        { from: 'workflowB-1', to: 'workflowB-2' },
      ];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({
        name: 'independent',
        nodes,
        edges,
      });

      let result = await scheduler.schedule(ast, {});
      expect(result.nodes.filter(n => n.state === 'success')).toHaveLength(2);

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');
      expect(result.nodes.filter(n => n.state === 'success')).toHaveLength(4);
    });

    it('空工作流立即完成', async () => {
      const nodes: INode[] = [];
      const edges: IEdge[] = [];

      const ast = createWorkflowGraphAst({ name: 'empty', nodes, edges });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      expect(executeAstSpy).not.toHaveBeenCalled();
    });

    it('单个孤立节点的工作流', async () => {
      const nodes: INode[] = [createTaskNode('solo')];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => ({
        ...node,
        state: 'success',
      }));

      const ast = createWorkflowGraphAst({ name: 'solo', nodes, edges });

      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      expect(result.nodes[0].state).toBe('success');
      expect(executeAstSpy).toHaveBeenCalledTimes(1);
    });
  });
});
