import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowScheduler } from '../execution/scheduler';
import { createWorkflowGraphAst, ArrayIteratorAst, Ast } from '../ast';
import { INode, IEdge } from '../types';
import * as executor from '../executor';
import { Node, Input, Output } from '../decorator';

@Node()
class DataProcessorAst extends Ast {
  type = 'DataProcessorAst';
  @Input() item?: any;
  @Output() processedItem?: any;
}

function createIteratorNode(
  id: string,
  array: any[] = [],
  currentIndex: number = 0,
  state: 'pending' | 'running' | 'success' | 'fail' = 'pending'
): INode {
  return {
    id,
    state,
    type: 'ArrayIteratorAst',
    array,
    currentIndex,
  };
}

function createProcessorNode(
  id: string,
  state: 'pending' | 'running' | 'success' | 'fail' = 'pending',
  data?: any
): INode {
  return {
    id,
    state,
    type: 'DataProcessorAst',
    ...data,
  };
}

describe('ArrayIteratorAst', () => {
  let scheduler: WorkflowScheduler;
  let executeAstSpy: any;

  beforeEach(() => {
    scheduler = new WorkflowScheduler();
    executeAstSpy = vi.spyOn(executor, 'executeAst');
    vi.clearAllMocks();
  });

  describe('基础迭代功能', () => {
    it('空数组立即完成', async () => {
      const nodes: INode[] = [createIteratorNode('iterator', [])];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          return {
            ...node,
            state: 'success',
            isDone: true,
            hasNext: false,
            currentItem: undefined,
          };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'emptyArray', nodes, edges });
      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      const iteratorNode = result.nodes.find(n => n.id === 'iterator') as any;
      expect(iteratorNode.isDone).toBe(true);
      expect(iteratorNode.hasNext).toBe(false);
    });

    it('单元素数组迭代一次', async () => {
      const testArray = ['item1'];
      const nodes: INode[] = [createIteratorNode('iterator', testArray)];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          const iter = node as any;
          return {
            ...iter,
            state: 'success',
            currentItem: iter.array[0],
            hasNext: false,
            isDone: true,
            currentIndex: 1,
          };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'singleItem', nodes, edges });
      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      const iteratorNode = result.nodes.find(n => n.id === 'iterator') as any;
      expect(iteratorNode.currentItem).toBe('item1');
      expect(iteratorNode.isDone).toBe(true);
      expect(iteratorNode.hasNext).toBe(false);
    });

    it('多元素数组正确迭代', async () => {
      const testArray = ['A', 'B', 'C'];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          const iter = node as any;
          const idx = iter.currentIndex;

          if (idx >= testArray.length) {
            return {
              ...iter,
              state: 'success',
              isDone: true,
              hasNext: false,
              currentItem: undefined,
            };
          }

          return {
            ...iter,
            state: 'success',
            currentItem: testArray[idx],
            hasNext: idx + 1 < testArray.length,
            isDone: idx + 1 >= testArray.length,
            currentIndex: idx + 1,
          };
        }
        return { ...node, state: 'success' };
      });

      const nodes1: INode[] = [createIteratorNode('iterator', testArray, 0)];
      const ast1 = createWorkflowGraphAst({ name: 'iter1', nodes: nodes1, edges: [] });
      const result1 = await scheduler.schedule(ast1, {});
      const iter1 = result1.nodes.find(n => n.id === 'iterator') as any;
      expect(iter1.currentItem).toBe('A');
      expect(iter1.hasNext).toBe(true);
      expect(iter1.currentIndex).toBe(1);

      const nodes2: INode[] = [createIteratorNode('iterator', testArray, 1)];
      const ast2 = createWorkflowGraphAst({ name: 'iter2', nodes: nodes2, edges: [] });
      const result2 = await scheduler.schedule(ast2, {});
      const iter2 = result2.nodes.find(n => n.id === 'iterator') as any;
      expect(iter2.currentItem).toBe('B');
      expect(iter2.hasNext).toBe(true);
      expect(iter2.currentIndex).toBe(2);

      const nodes3: INode[] = [createIteratorNode('iterator', testArray, 2)];
      const ast3 = createWorkflowGraphAst({ name: 'iter3', nodes: nodes3, edges: [] });
      const result3 = await scheduler.schedule(ast3, {});
      const iter3 = result3.nodes.find(n => n.id === 'iterator') as any;
      expect(iter3.currentItem).toBe('C');
      expect(iter3.hasNext).toBe(false);
      expect(iter3.isDone).toBe(true);
    });
  });

  describe('迭代器与处理器组合', () => {
    it('使用条件边实现循环: Iterator → Processor → Iterator (hasNext=true)', async () => {
      const testArray = ['data1', 'data2'];

      const nodes: INode[] = [
        createIteratorNode('iterator', testArray),
        createProcessorNode('processor'),
        createProcessorNode('end'),
      ];

      const edges: IEdge[] = [
        { from: 'iterator', to: 'processor', fromProperty: 'currentItem', toProperty: 'item' },
        {
          from: 'iterator',
          to: 'end',
          condition: { property: 'isDone', value: true },
        },
      ];

      const processedItems: string[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          const iter = node as any;
          const idx = iter.currentIndex;

          if (idx >= testArray.length) {
            return {
              ...iter,
              state: 'success',
              isDone: true,
              hasNext: false,
              currentItem: undefined,
            };
          }

          return {
            ...iter,
            state: 'success',
            currentItem: testArray[idx],
            hasNext: idx + 1 < testArray.length,
            isDone: idx + 1 >= testArray.length,
            currentIndex: idx + 1,
          };
        }

        if (node.type === 'DataProcessorAst') {
          const proc = node as any;
          if (proc.item) {
            processedItems.push(proc.item);
          }
          return {
            ...proc,
            state: 'success',
            processedItem: proc.item ? `processed_${proc.item}` : undefined,
          };
        }

        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'loopIterator', nodes, edges });

      let result = ast;
      const maxSteps = 10;
      let steps = 0;

      while (result.state === 'running' || result.state === 'pending') {
        result = await scheduler.schedule(result, {});
        steps++;
        if (steps > maxSteps) break;
      }

      expect(result.state).toBe('success');
      expect(processedItems.length).toBeGreaterThanOrEqual(1);
      expect(processedItems[0]).toBe('data1');
    });

    it('数组元素依次传递给处理器', async () => {
      const testArray = [10, 20, 30];

      const nodes: INode[] = [
        createIteratorNode('iterator', testArray),
        createProcessorNode('processor'),
      ];

      const edges: IEdge[] = [
        { from: 'iterator', to: 'processor', fromProperty: 'currentItem', toProperty: 'item' },
      ];

      const processedItems: any[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          const iter = node as any;
          const idx = iter.currentIndex;

          if (idx >= testArray.length) {
            return {
              ...iter,
              state: 'success',
              isDone: true,
              hasNext: false,
              currentItem: undefined,
            };
          }

          return {
            ...iter,
            state: 'success',
            currentItem: testArray[idx],
            hasNext: idx + 1 < testArray.length,
            isDone: idx + 1 >= testArray.length,
            currentIndex: idx + 1,
          };
        }

        if (node.type === 'DataProcessorAst') {
          const proc = node as any;
          processedItems.push(proc.item);
          return {
            ...proc,
            state: 'success',
            processedItem: proc.item * 2,
          };
        }

        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'dataFlow', nodes, edges });

      let result = await scheduler.schedule(ast, {});
      expect(result.state).toBe('running');

      result = await scheduler.schedule(result, {});
      expect(result.state).toBe('success');

      expect(processedItems[0]).toBe(10);
    });
  });

  describe('边界条件', () => {
    it('currentIndex 超出数组长度时标记为完成', async () => {
      const nodes: INode[] = [createIteratorNode('iterator', ['A', 'B'], 5)];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          return {
            ...node,
            state: 'success',
            isDone: true,
            hasNext: false,
            currentItem: undefined,
          };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'outOfBounds', nodes, edges });
      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      const iteratorNode = result.nodes.find(n => n.id === 'iterator') as any;
      expect(iteratorNode.isDone).toBe(true);
      expect(iteratorNode.currentItem).toBeUndefined();
    });

    it('非数组输入时安全处理', async () => {
      const nodes: INode[] = [
        {
          id: 'iterator',
          state: 'pending',
          type: 'ArrayIteratorAst',
          array: 'not an array' as any,
          currentIndex: 0,
        },
      ];
      const edges: IEdge[] = [];

      executeAstSpy.mockImplementation(async (node: INode) => {
        if (node.type === 'ArrayIteratorAst') {
          return {
            ...node,
            state: 'success',
            isDone: true,
            hasNext: false,
            currentItem: undefined,
          };
        }
        return { ...node, state: 'success' };
      });

      const ast = createWorkflowGraphAst({ name: 'invalidInput', nodes, edges });
      const result = await scheduler.schedule(ast, {});

      expect(result.state).toBe('success');
      const iteratorNode = result.nodes.find(n => n.id === 'iterator') as any;
      expect(iteratorNode.isDone).toBe(true);
    });
  });
});
