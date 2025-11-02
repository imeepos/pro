import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyAnalyzer } from '../execution/property-analyzer';
import { INode, IEdge } from '../types';

describe('PropertyAnalyzer', () => {
  let analyzer: PropertyAnalyzer;

  beforeEach(() => {
    analyzer = new PropertyAnalyzer();
  });

  describe('isInputProperty', () => {
    const createNode = (id: string): INode => ({
      id,
      state: 'pending',
      type: 'test',
    });

    describe('无入边场景', () => {
      it('无任何边指向节点时，属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });

      it('有边但不指向该节点时，属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node2' },
          { from: 'node2', to: 'node3' },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });
    });

    describe('无条件边场景', () => {
      it('存在无条件边指向该节点（未指定 toProperty）时，任意属性应为非输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node1' },
        ];

        const result = analyzer.isInputProperty(node, 'anyProperty', edges);

        expect(result).toBe(false);
      });

      it('存在无条件边明确指向该属性时，该属性应为非输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node1', toProperty: 'value' },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(false);
      });

      it('无条件边指向其他属性时，当前属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node1', toProperty: 'otherProperty' },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });
    });

    describe('条件边场景', () => {
      it('仅有条件边指向该节点（未指定 toProperty）时，任意属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            condition: { property: 'flag', value: true },
          },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });

      it('仅有条件边明确指向该属性时，该属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'flag', value: true },
          },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });

      it('条件边指向其他属性时，当前属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            toProperty: 'otherProperty',
            condition: { property: 'flag', value: true },
          },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });
    });

    describe('混合场景', () => {
      it('同时存在条件边和无条件边（未指定 toProperty）时，属性应为非输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            condition: { property: 'flag', value: true },
          },
          { from: 'node2', to: 'node1' },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(false);
      });

      it('多个条件边但有一个无条件边指向该属性时，该属性应为非输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'flag1', value: true },
          },
          {
            from: 'node2',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'flag2', value: false },
          },
          {
            from: 'node3',
            to: 'node1',
            toProperty: 'value',
          },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(false);
      });

      it('多个条件边且无条件边指向其他属性时，当前属性应为输入属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'flag1', value: true },
          },
          {
            from: 'node2',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'flag2', value: false },
          },
          {
            from: 'node3',
            to: 'node1',
            toProperty: 'otherProperty',
          },
        ];

        const result = analyzer.isInputProperty(node, 'value', edges);

        expect(result).toBe(true);
      });
    });

    describe('边界场景', () => {
      it('处理未指定 toProperty 的边应影响所有属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node1' },
        ];

        expect(analyzer.isInputProperty(node, 'prop1', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'prop2', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'prop3', edges)).toBe(false);
      });

      it('处理多个源节点指向同一个节点的不同属性', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          { from: 'node0', to: 'node1', toProperty: 'value1' },
          { from: 'node2', to: 'node1', toProperty: 'value2' },
          { from: 'node3', to: 'node1', toProperty: 'value3' },
        ];

        expect(analyzer.isInputProperty(node, 'value1', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'value2', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'value3', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'value4', edges)).toBe(true);
      });

      it('处理复杂的条件和属性组合', () => {
        const node = createNode('node1');
        const edges: IEdge[] = [
          {
            from: 'node0',
            to: 'node1',
            condition: { property: 'flag', value: true },
          },
          {
            from: 'node2',
            to: 'node1',
            toProperty: 'value',
            condition: { property: 'enabled', value: false },
          },
          { from: 'node3', to: 'node1', toProperty: 'config' },
        ];

        expect(analyzer.isInputProperty(node, 'value', edges)).toBe(true);
        expect(analyzer.isInputProperty(node, 'config', edges)).toBe(false);
        expect(analyzer.isInputProperty(node, 'other', edges)).toBe(true);
      });
    });

    describe('数据流分析', () => {
      it('DAG 工作流中的典型数据流场景', () => {
        const nodes = {
          input: createNode('input'),
          transform: createNode('transform'),
          output: createNode('output'),
        };

        const edges: IEdge[] = [
          { from: 'input', to: 'transform', toProperty: 'data' },
          { from: 'transform', to: 'output', toProperty: 'result' },
        ];

        expect(analyzer.isInputProperty(nodes.input, 'rawData', edges)).toBe(true);
        expect(analyzer.isInputProperty(nodes.transform, 'data', edges)).toBe(false);
        expect(analyzer.isInputProperty(nodes.output, 'result', edges)).toBe(false);
      });

      it('条件分支场景', () => {
        const node = createNode('processor');
        const edges: IEdge[] = [
          {
            from: 'validator',
            to: 'processor',
            toProperty: 'validData',
            condition: { property: 'isValid', value: true },
          },
          {
            from: 'validator',
            to: 'processor',
            toProperty: 'invalidData',
            condition: { property: 'isValid', value: false },
          },
        ];

        expect(analyzer.isInputProperty(node, 'validData', edges)).toBe(true);
        expect(analyzer.isInputProperty(node, 'invalidData', edges)).toBe(true);
        expect(analyzer.isInputProperty(node, 'fallbackData', edges)).toBe(true);
      });
    });
  });
});
