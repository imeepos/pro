import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataFlowManager } from '../execution/data-flow-manager';
import { INode, IEdge } from '../types';
import { createTestNode, createTestEdge } from './helpers';

vi.mock('@pro/core', () => ({
  root: {
    get: vi.fn(),
  },
}));

vi.mock('../decorator', () => ({
  INPUT: Symbol('INPUT'),
  OUTPUT: Symbol('OUTPUT'),
  resolveConstructor: vi.fn((target) => {
    if (typeof target === 'function') return target;
    if (target?.constructor) return target.constructor;
    return class MockConstructor {};
  }),
}));

vi.mock('../generate', () => ({
  fromJson: vi.fn((node) => node),
}));

import { root } from '@pro/core';
import { resolveConstructor } from '../decorator';
import { fromJson } from '../generate';

describe('DataFlowManager', () => {
  let manager: DataFlowManager;
  const mockRoot = root as { get: ReturnType<typeof vi.fn> };
  const mockFromJson = fromJson as ReturnType<typeof vi.fn>;
  const mockResolveConstructor = resolveConstructor as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = new DataFlowManager();
    vi.clearAllMocks();
  });

  describe('extractNodeOutputs', () => {
    describe('使用装饰器元数据提取输出', () => {
      it('成功提取带有 @Output() 装饰器的属性', () => {
        class TestNode {}
        const node = createTestNode('node1', 'success', {
          result: 'hello',
          count: 42,
          ignored: undefined,
        });

        mockFromJson.mockReturnValue(node);
        mockResolveConstructor.mockReturnValue(TestNode);
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'result' },
          { target: TestNode, propertyKey: 'count' },
        ]);

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({
          result: 'hello',
          count: 42,
        });
        expect(outputs.ignored).toBeUndefined();
      });

      it('过滤掉值为 undefined 的输出属性', () => {
        class TestNode {}
        const node = createTestNode('node1', 'success', {
          result: 'data',
          empty: undefined,
        });

        mockFromJson.mockReturnValue(node);
        mockResolveConstructor.mockReturnValue(TestNode);
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'result' },
          { target: TestNode, propertyKey: 'empty' },
        ]);

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({ result: 'data' });
        expect(outputs.empty).toBeUndefined();
      });

      it('空输出装饰器使用回退方案', () => {
        class TestNode {}
        const node = createTestNode('node1', 'success', {
          result: 'data',
        });

        mockFromJson.mockReturnValue(node);
        mockResolveConstructor.mockReturnValue(TestNode);
        mockRoot.get.mockReturnValue([]);

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({ result: 'data' });
      });
    });

    describe('装饰器不可用时的回退方案', () => {
      it('提取所有非系统属性作为输出', () => {
        mockFromJson.mockImplementation(() => {
          throw new Error('Decorator metadata not available');
        });

        const node = createTestNode('node1', 'success', {
          result: 'hello',
          count: 42,
          data: { nested: true },
        });

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({
          result: 'hello',
          count: 42,
          data: { nested: true },
        });
        expect(outputs.id).toBeUndefined();
        expect(outputs.state).toBeUndefined();
        expect(outputs.type).toBeUndefined();
      });

      it('排除系统属性 id, state, type', () => {
        mockFromJson.mockImplementation(() => {
          throw new Error('Decorator metadata not available');
        });

        const node: INode = {
          id: 'node1',
          state: 'success',
          type: 'TestNode',
          result: 'data',
        } as any;

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({ result: 'data' });
      });

      it('过滤掉值为 undefined 的属性', () => {
        mockFromJson.mockImplementation(() => {
          throw new Error('Decorator metadata not available');
        });

        const node = createTestNode('node1', 'success', {
          result: 'data',
          empty: undefined,
          nullValue: null,
        });

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({
          result: 'data',
          nullValue: null,
        });
        expect(outputs.empty).toBeUndefined();
      });

      it('空节点返回空对象', () => {
        mockFromJson.mockImplementation(() => {
          throw new Error('Decorator metadata not available');
        });

        const node = createTestNode('node1', 'success');

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({});
      });
    });

    describe('边界情况', () => {
      it('处理包含 null 值的输出', () => {
        class TestNode {}
        const node = createTestNode('node1', 'success', {
          result: null,
          count: 0,
          flag: false,
        });

        mockFromJson.mockReturnValue(node);
        mockResolveConstructor.mockReturnValue(TestNode);
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'result' },
          { target: TestNode, propertyKey: 'count' },
          { target: TestNode, propertyKey: 'flag' },
        ]);

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs).toEqual({
          result: null,
          count: 0,
          flag: false,
        });
      });

      it('处理复杂数据结构输出', () => {
        class TestNode {}
        const node = createTestNode('node1', 'success', {
          array: [1, 2, 3],
          object: { nested: { deep: 'value' } },
          date: new Date('2025-01-01'),
        });

        mockFromJson.mockReturnValue(node);
        mockResolveConstructor.mockReturnValue(TestNode);
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'array' },
          { target: TestNode, propertyKey: 'object' },
          { target: TestNode, propertyKey: 'date' },
        ]);

        const outputs = manager.extractNodeOutputs(node);

        expect(outputs.array).toEqual([1, 2, 3]);
        expect(outputs.object).toEqual({ nested: { deep: 'value' } });
        expect(outputs.date).toBeInstanceOf(Date);
      });
    });
  });

  describe('assignInputsToNode', () => {
    describe('无条件边的数据赋值', () => {
      it('整体对象传递（无属性映射）', () => {
        const sourceNode = createTestNode('source', 'success', {
          result: 'data',
          count: 42,
        });
        const targetNode = createTestNode('target', 'pending');
        const edges = [createTestEdge('source', 'target')];
        const allOutputs = new Map([['source', { result: 'data', count: 42 }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBe('data');
        expect((targetNode as any).count).toBe(42);
      });

      it('精确属性映射（fromProperty → toProperty）', () => {
        const sourceNode = createTestNode('source', 'success');
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'output',
            toProperty: 'input',
          }),
        ];
        const allOutputs = new Map([
          ['source', { output: 'value', other: 'ignored' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).input).toBe('value');
        expect((targetNode as any).other).toBeUndefined();
      });

      it('多个无条件边按顺序赋值', () => {
        const source1 = createTestNode('source1', 'success');
        const source2 = createTestNode('source2', 'success');
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source1', 'target'),
          createTestEdge('source2', 'target'),
        ];
        const allOutputs = new Map([
          ['source1', { value: 'first' }],
          ['source2', { value: 'second', extra: 'data' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [
          source1,
          source2,
        ]);

        expect((targetNode as any).value).toBe('second');
        expect((targetNode as any).extra).toBe('data');
      });

      it('源节点输出不存在时跳过赋值', () => {
        const sourceNode = createTestNode('source', 'success');
        const targetNode = createTestNode('target', 'pending', { value: 'original' });
        const edges = [createTestEdge('source', 'target')];
        const allOutputs = new Map();

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).value).toBe('original');
      });

      it('源属性值为 undefined 时不赋值', () => {
        const sourceNode = createTestNode('source', 'success');
        const targetNode = createTestNode('target', 'pending', { input: 'original' });
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'output',
            toProperty: 'input',
          }),
        ];
        const allOutputs = new Map([
          ['source', { output: undefined, other: 'value' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).input).toBe('original');
      });
    });

    describe('条件边满足时的数据赋值', () => {
      it('条件满足且源节点状态为 success', () => {
        const sourceNode = createTestNode('source', 'success', { flag: true });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'data' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBe('data');
      });

      it('条件满足时精确属性映射', () => {
        const sourceNode = createTestNode('source', 'success', { flag: 'yes' });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'output',
            toProperty: 'input',
            condition: { property: 'flag', value: 'yes' },
          }),
        ];
        const allOutputs = new Map([['source', { output: 'value' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).input).toBe('value');
      });

      it('布尔条件：true 值匹配', () => {
        const sourceNode = createTestNode('source', 'success', { isValid: true });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'isValid', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { validData: 'data' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).validData).toBe('data');
      });

      it('布尔条件：false 值匹配', () => {
        const sourceNode = createTestNode('source', 'success', { hasError: false });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'hasError', value: false },
          }),
        ];
        const allOutputs = new Map([['source', { cleanData: 'data' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).cleanData).toBe('data');
      });
    });

    describe('条件边不满足时跳过赋值', () => {
      it('条件值不匹配', () => {
        const sourceNode = createTestNode('source', 'success', { flag: false });
        const targetNode = createTestNode('target', 'pending', { result: 'original' });
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'new' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBe('original');
      });

      it('源节点状态不是 success', () => {
        const sourceNode = createTestNode('source', 'fail', { flag: true });
        const targetNode = createTestNode('target', 'pending', { result: 'original' });
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'new' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBe('original');
      });

      it('源节点状态为 pending', () => {
        const sourceNode = createTestNode('source', 'pending', { flag: true });
        const targetNode = createTestNode('target', 'pending', { result: 'original' });
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'new' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBe('original');
      });

      it('源节点找不到时跳过', () => {
        const targetNode = createTestNode('target', 'pending', { result: 'original' });
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'new' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, []);

        expect((targetNode as any).result).toBe('original');
      });
    });

    describe('边的优先级（条件边覆盖无条件边）', () => {
      it('无条件边先执行，条件边后覆盖', () => {
        const sourceNode = createTestNode('source', 'success', { flag: true });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'data',
            toProperty: 'value',
          }),
          createTestEdge('source', 'target', {
            fromProperty: 'override',
            toProperty: 'value',
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([
          ['source', { data: 'first', override: 'second' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).value).toBe('second');
      });

      it('条件不满足时保留无条件边的值', () => {
        const sourceNode = createTestNode('source', 'success', { flag: false });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'data',
            toProperty: 'value',
          }),
          createTestEdge('source', 'target', {
            fromProperty: 'override',
            toProperty: 'value',
            condition: { property: 'flag', value: true },
          }),
        ];
        const allOutputs = new Map([
          ['source', { data: 'first', override: 'second' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).value).toBe('first');
      });

      it('多个条件边按顺序覆盖', () => {
        const sourceNode = createTestNode('source', 'success', {
          flag1: true,
          flag2: true,
        });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            fromProperty: 'base',
            toProperty: 'value',
          }),
          createTestEdge('source', 'target', {
            fromProperty: 'override1',
            toProperty: 'value',
            condition: { property: 'flag1', value: true },
          }),
          createTestEdge('source', 'target', {
            fromProperty: 'override2',
            toProperty: 'value',
            condition: { property: 'flag2', value: true },
          }),
        ];
        const allOutputs = new Map([
          ['source', { base: 'first', override1: 'second', override2: 'third' }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [
          sourceNode,
        ]);

        expect((targetNode as any).value).toBe('third');
      });
    });

    describe('边界情况', () => {
      it('无入边时节点属性不变', () => {
        const targetNode = createTestNode('target', 'pending', { value: 'original' });
        const edges: IEdge[] = [];
        const allOutputs = new Map();

        manager.assignInputsToNode(targetNode, allOutputs, edges, []);

        expect((targetNode as any).value).toBe('original');
      });

      it('处理 null 和 0 等假值', () => {
        const sourceNode = createTestNode('source', 'success');
        const targetNode = createTestNode('target', 'pending');
        const edges = [createTestEdge('source', 'target')];
        const allOutputs = new Map([
          ['source', { nullValue: null, zero: 0, emptyString: '', falseBool: false }],
        ]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).nullValue).toBeNull();
        expect((targetNode as any).zero).toBe(0);
        expect((targetNode as any).emptyString).toBe('');
        expect((targetNode as any).falseBool).toBe(false);
      });

      it('处理复杂条件值类型', () => {
        const sourceNode = createTestNode('source', 'success', {
          complexFlag: { nested: 'value' },
        });
        const targetNode = createTestNode('target', 'pending');
        const edges = [
          createTestEdge('source', 'target', {
            condition: { property: 'complexFlag', value: { nested: 'value' } },
          }),
        ];
        const allOutputs = new Map([['source', { result: 'data' }]]);

        manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

        expect((targetNode as any).result).toBeUndefined();
      });
    });
  });

  describe('initializeInputNodes', () => {
    beforeEach(() => {
      mockFromJson.mockImplementation((node) => node);
      mockResolveConstructor.mockImplementation((node) => {
        return node.constructor || class MockConstructor {};
      });
    });

    describe('从 context 初始化输入属性', () => {
      it('精确匹配（nodeId.propertyKey）优先', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges: IEdge[] = [];
        const context = {
          'node1.value': 'exact',
          value: 'fuzzy',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBe('exact');
      });

      it('模糊匹配（propertyKey）作为回退', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges: IEdge[] = [];
        const context = { value: 'fuzzy' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBe('fuzzy');
      });

      it('初始化多个输入属性', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'input1' },
          { target: TestNode, propertyKey: 'input2' },
          { target: TestNode, propertyKey: 'input3' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges: IEdge[] = [];
        const context = {
          'node1.input1': 'value1',
          input2: 'value2',
          input3: 'value3',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).input1).toBe('value1');
        expect((node as any).input2).toBe('value2');
        expect((node as any).input3).toBe('value3');
      });

      it('context 中不存在的属性保持 undefined', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges: IEdge[] = [];
        const context = {};

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBeUndefined();
      });
    });

    describe('只初始化输入属性', () => {
      it('有无条件边指向的属性不初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'input' },
          { target: TestNode, propertyKey: 'fromEdge' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [
          createTestEdge('node0', 'node1', { toProperty: 'fromEdge' }),
        ];
        const context = {
          input: 'value1',
          fromEdge: 'value2',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).input).toBe('value1');
        expect((node as any).fromEdge).toBeUndefined();
      });

      it('仅有条件边的属性可以初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'conditionalInput' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [
          createTestEdge('node0', 'node1', {
            toProperty: 'conditionalInput',
            condition: { property: 'flag', value: true },
          }),
        ];
        const context = {
          conditionalInput: 'value',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).conditionalInput).toBe('value');
      });

      it('整体对象传递边（无 toProperty）阻止所有属性初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'input1' },
          { target: TestNode, propertyKey: 'input2' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [createTestEdge('node0', 'node1')];
        const context = {
          input1: 'value1',
          input2: 'value2',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).input1).toBeUndefined();
        expect((node as any).input2).toBeUndefined();
      });
    });

    describe('多节点初始化', () => {
      it('初始化多个节点的输入', () => {
        class TestNode1 {}
        class TestNode2 {}
        const node1 = createTestNode('node1', 'pending');
        const node2 = createTestNode('node2', 'pending');
        Object.setPrototypeOf(node1, TestNode1.prototype);
        Object.setPrototypeOf(node2, TestNode2.prototype);

        mockResolveConstructor.mockImplementation((node) => {
          if (node === node1) return TestNode1;
          if (node === node2) return TestNode2;
          return node.constructor;
        });

        mockRoot.get.mockReturnValue([
          { target: TestNode1, propertyKey: 'input1' },
          { target: TestNode2, propertyKey: 'input2' },
        ]);

        const edges = [
          createTestEdge('node1', 'node2', {
            fromProperty: 'output1',
            toProperty: 'otherProperty',
          }),
        ];
        const context = {
          'node1.input1': 'value1',
          'node2.input2': 'value2',
        };

        manager.initializeInputNodes([node1, node2], edges, context);

        expect((node1 as any).input1).toBe('value1');
        expect((node2 as any).input2).toBe('value2');
      });

      it('不同节点相同属性名独立处理', () => {
        class TestNode1 {}
        class TestNode2 {}
        const node1 = createTestNode('node1', 'pending');
        const node2 = createTestNode('node2', 'pending');
        Object.setPrototypeOf(node1, TestNode1.prototype);
        Object.setPrototypeOf(node2, TestNode2.prototype);

        mockRoot.get.mockImplementation(() => [
          { target: TestNode1, propertyKey: 'value' },
          { target: TestNode2, propertyKey: 'value' },
        ]);

        const edges: IEdge[] = [];
        const context = {
          'node1.value': 'first',
          'node2.value': 'second',
        };

        manager.initializeInputNodes([node1, node2], edges, context);

        expect((node1 as any).value).toBe('first');
        expect((node2 as any).value).toBe('second');
      });
    });

    describe('边界情况', () => {
      it('处理 null 和假值', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'nullValue' },
          { target: TestNode, propertyKey: 'zero' },
          { target: TestNode, propertyKey: 'falseBool' },
          { target: TestNode, propertyKey: 'emptyString' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges: IEdge[] = [];
        const context = {
          nullValue: null,
          zero: 0,
          falseBool: false,
          emptyString: '',
        };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).nullValue).toBeNull();
        expect((node as any).zero).toBe(0);
        expect((node as any).falseBool).toBe(false);
        expect((node as any).emptyString).toBe('');
      });

      it('空节点列表不报错', () => {
        expect(() => {
          manager.initializeInputNodes([], [], {});
        }).not.toThrow();
      });

      it('空 context 不报错', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        expect(() => {
          manager.initializeInputNodes([node], [], {});
        }).not.toThrow();
      });
    });
  });

  describe('resolveContextValue (private method testing via public interface)', () => {
    beforeEach(() => {
      mockFromJson.mockImplementation((node) => node);
      mockResolveConstructor.mockImplementation((node) => {
        return node.constructor || class MockConstructor {};
      });
    });

    describe('精确匹配优先', () => {
      it('精确匹配存在时返回精确值', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const context = {
          'node1.value': 'exact',
          value: 'fuzzy',
        };

        manager.initializeInputNodes([node], [], context);

        expect((node as any).value).toBe('exact');
      });
    });

    describe('模糊匹配回退', () => {
      it('精确匹配不存在时使用模糊匹配', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const context = { value: 'fuzzy' };

        manager.initializeInputNodes([node], [], context);

        expect((node as any).value).toBe('fuzzy');
      });
    });

    describe('匹配不到返回 undefined', () => {
      it('精确和模糊匹配都不存在时不赋值', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending', { value: 'original' });
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const context = { other: 'data' };

        manager.initializeInputNodes([node], [], context);

        expect((node as any).value).toBe('original');
      });
    });
  });

  describe('isInputProperty (private method testing via public interface)', () => {
    beforeEach(() => {
      mockFromJson.mockImplementation((node) => node);
      mockResolveConstructor.mockImplementation((node) => {
        return node.constructor || class MockConstructor {};
      });
    });

    describe('无入边的属性为输入属性', () => {
      it('无任何边时属性可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const context = { value: 'data' };

        manager.initializeInputNodes([node], [], context);

        expect((node as any).value).toBe('data');
      });

      it('有边但不指向该节点时属性可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [createTestEdge('node0', 'node2')];
        const context = { value: 'data' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBe('data');
      });
    });

    describe('有无条件边的属性为非输入属性', () => {
      it('无条件边指向属性时不可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [
          createTestEdge('node0', 'node1', { toProperty: 'value' }),
        ];
        const context = { value: 'data' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBeUndefined();
      });

      it('无条件边整体对象传递时所有属性不可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [createTestEdge('node0', 'node1')];
        const context = { value: 'data' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBeUndefined();
      });
    });

    describe('仅有条件边的属性为输入属性', () => {
      it('条件边指向属性时仍可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [
          createTestEdge('node0', 'node1', {
            toProperty: 'value',
            condition: { property: 'flag', value: true },
          }),
        ];
        const context = { value: 'data' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBe('data');
      });

      it('多个条件边但无无条件边时可初始化', () => {
        class TestNode {}
        const node = createTestNode('node1', 'pending');
        mockRoot.get.mockReturnValue([
          { target: TestNode, propertyKey: 'value' },
        ]);
        Object.setPrototypeOf(node, TestNode.prototype);

        const edges = [
          createTestEdge('node0', 'node1', {
            toProperty: 'value',
            condition: { property: 'flag1', value: true },
          }),
          createTestEdge('node2', 'node1', {
            toProperty: 'value',
            condition: { property: 'flag2', value: false },
          }),
        ];
        const context = { value: 'data' };

        manager.initializeInputNodes([node], edges, context);

        expect((node as any).value).toBe('data');
      });
    });
  });

  describe('综合场景', () => {
    it('完整数据流：初始化 -> 执行 -> 传递', () => {
      class Node1 {}
      class Node2 {}
      const node1 = createTestNode('node1', 'pending');
      const node2 = createTestNode('node2', 'pending');
      Object.setPrototypeOf(node1, Node1.prototype);
      Object.setPrototypeOf(node2, Node2.prototype);

      mockFromJson.mockImplementation((node) => node);
      mockResolveConstructor.mockImplementation((node) => {
        if (node === node1) return Node1;
        if (node === node2) return Node2;
        return node.constructor;
      });
      mockRoot.get.mockImplementation((token) => {
        if (token === Symbol.for('INPUT')) {
          return [
            { target: Node1, propertyKey: 'input' },
            { target: Node2, propertyKey: 'processedData' },
          ];
        }
        if (token === Symbol.for('OUTPUT')) {
          return [{ target: Node1, propertyKey: 'output' }];
        }
        return [
          { target: Node1, propertyKey: 'input' },
          { target: Node2, propertyKey: 'processedData' },
        ];
      });

      const edges = [
        createTestEdge('node1', 'node2', {
          fromProperty: 'output',
          toProperty: 'processedData',
        }),
      ];
      const context = { input: 'initial' };

      manager.initializeInputNodes([node1, node2], edges, context);
      expect((node1 as any).input).toBe('initial');

      (node1 as any).output = 'processed';
      node1.state = 'success';

      const outputs = new Map([['node1', { output: 'processed' }]]);
      manager.assignInputsToNode(node2, outputs, edges, [node1]);

      expect((node2 as any).processedData).toBe('processed');
    });

    it('条件分支场景：根据条件选择不同路径', () => {
      class Validator {}
      class SuccessHandler {}
      class ErrorHandler {}

      const validator = createTestNode('validator', 'success', {
        isValid: true,
        validData: 'clean',
        errorData: 'dirty',
      });
      const successHandler = createTestNode('success', 'pending');
      const errorHandler = createTestNode('error', 'pending');

      Object.setPrototypeOf(validator, Validator.prototype);
      Object.setPrototypeOf(successHandler, SuccessHandler.prototype);
      Object.setPrototypeOf(errorHandler, ErrorHandler.prototype);

      const edges = [
        createTestEdge('validator', 'success', {
          fromProperty: 'validData',
          toProperty: 'data',
          condition: { property: 'isValid', value: true },
        }),
        createTestEdge('validator', 'error', {
          fromProperty: 'errorData',
          toProperty: 'data',
          condition: { property: 'isValid', value: false },
        }),
      ];

      const outputs = new Map([
        ['validator', { validData: 'clean', errorData: 'dirty' }],
      ]);

      manager.assignInputsToNode(successHandler, outputs, edges, [validator]);
      manager.assignInputsToNode(errorHandler, outputs, edges, [validator]);

      expect((successHandler as any).data).toBe('clean');
      expect((errorHandler as any).data).toBeUndefined();
    });
  });
});
