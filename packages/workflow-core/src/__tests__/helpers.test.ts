import { describe, it, expect } from 'vitest';
import { createTestNode, createTestEdge } from './helpers';

describe('createTestNode', () => {
  it('creates node with default state', () => {
    const node = createTestNode('test-1');
    expect(node.id).toBe('test-1');
    expect(node.state).toBe('pending');
    expect(node.type).toBe('TestNode');
  });

  it('creates node with custom state', () => {
    const node = createTestNode('test-2', 'running');
    expect(node.state).toBe('running');
  });

  it('merges additional data', () => {
    const node = createTestNode('test-3', 'success', { foo: 'bar' });
    expect(node.foo).toBe('bar');
  });
});

describe('createTestEdge', () => {
  it('creates edge with required fields', () => {
    const edge = createTestEdge('a', 'b');
    expect(edge.from).toBe('a');
    expect(edge.to).toBe('b');
  });

  it('merges additional options', () => {
    const edge = createTestEdge('a', 'b', {
      fromProperty: 'output',
      toProperty: 'input',
    });
    expect(edge.fromProperty).toBe('output');
    expect(edge.toProperty).toBe('input');
  });
});
