import { describe, it, expect } from 'vitest';
import { Input, Output, Node, getInputMetadata, InputMetadata } from '../decorator';

describe('Input Decorator with isMulti Support', () => {

  it('creates single input without isMulti option', () => {
    @Node()
    class NodeA {
      @Input()
      value: string;
    }

    const metadata = getInputMetadata(NodeA, 'value') as InputMetadata;
    expect(metadata.isMulti).toBe(false);
  });

  it('creates multi input with isMulti=true', () => {
    @Node()
    class NodeB {
      @Input({ isMulti: true })
      values: any[];
    }

    const metadata = getInputMetadata(NodeB, 'values') as InputMetadata;
    expect(metadata.isMulti).toBe(true);
  });

  it('retrieves all input metadata for a class', () => {
    @Node()
    class NodeC {
      @Input()
      single: string;

      @Input({ isMulti: true })
      multiple: any[];
    }

    const allMetadata = getInputMetadata(NodeC) as InputMetadata[];
    expect(allMetadata.length).toBe(2);
    expect(allMetadata.some(m => m.propertyKey === 'single' && !m.isMulti)).toBe(true);
    expect(allMetadata.some(m => m.propertyKey === 'multiple' && m.isMulti)).toBe(true);
  });

  it('defaults to isMulti=false when not specified', () => {
    @Node()
    class NodeD {
      @Input()
      defaultInput: string;
    }

    const metadata = getInputMetadata(NodeD, 'defaultInput') as InputMetadata;
    expect(metadata.isMulti).toBe(false);
  });

  it('returns empty array for class with no inputs', () => {
    @Node()
    class NodeE {}

    const metadata = getInputMetadata(NodeE) as InputMetadata[];
    expect(Array.isArray(metadata)).toBe(true);
  });
});
