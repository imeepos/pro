# Multi-Input Support Implementation

## Overview

Added `isMulti?: boolean` option to the `@Input()` decorator to enable properties to accept multiple edge inputs and aggregate them into arrays.

## Changes Made

### 1. Decorator Definition (`packages/workflow-core/src/decorator.ts`)

#### New Interfaces
- **`InputOptions`**: Configuration interface for the `@Input()` decorator
  - `isMulti?: boolean` - Marks the input to accumulate values from multiple edges

- **`InputMetadata`**: Metadata structure stored by the decorator
  - `target: Type<any>` - The class constructor
  - `propertyKey: string | symbol` - The property name
  - `isMulti?: boolean` - Whether this input accepts multiple values

#### Updated `Input()` Decorator
```typescript
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                isMulti: options?.isMulti ?? false  // Defaults to false
            }
        }])
    };
}
```

#### New Helper Function
```typescript
export function getInputMetadata(
    target: Type<any> | object,
    propertyKey?: string | symbol
): InputMetadata | InputMetadata[] {
    // Returns metadata for a specific property or all inputs of a class
}
```

### 2. DataFlowManager Integration (`packages/workflow-core/src/execution/data-flow-manager.ts`)

#### Value Assignment Logic
Added `assignValueToProperty()` method that:
- Checks if an input has `isMulti: true`
- If `isMulti` is true and the property doesn't exist, initializes it as an array
- Appends values to the array instead of overwriting
- Falls back to single-value assignment for regular inputs

```typescript
private assignValueToProperty(
    targetNode: INode,
    propertyKey: string | symbol,
    value: any,
    inputMetadataMap: Map<string | symbol, InputMetadata>
): void {
    const metadata = inputMetadataMap.get(propertyKey);
    const isMulti = metadata?.isMulti ?? false;

    if (isMulti) {
        if (!Array.isArray((targetNode as any)[propertyKey])) {
            (targetNode as any)[propertyKey] = [];
        }
        (targetNode as any)[propertyKey].push(value);
    } else {
        (targetNode as any)[propertyKey] = value;
    }
}
```

## Usage Example

```typescript
@Node()
class DataAggregator {
  // Single input - overwritten by each edge
  @Input()
  config: Record<string, any>;

  // Multi input - accumulated into array
  @Input({ isMulti: true })
  results: any[];

  @Output()
  aggregated: any;
}
```

## Runtime Metadata Access

Two ways to read `isMulti` metadata:

### Get Metadata for Specific Property
```typescript
const metadata = getInputMetadata(DataAggregator, 'results');
// Returns: { target: DataAggregator, propertyKey: 'results', isMulti: true }
```

### Get All Input Metadata for a Class
```typescript
const allInputs = getInputMetadata(DataAggregator);
// Returns: [
//   { target: DataAggregator, propertyKey: 'config', isMulti: false },
//   { target: DataAggregator, propertyKey: 'results', isMulti: true }
// ]
```

## Design Principles Applied

1. **Existence Implies Necessity**: `isMulti` is optional and defaults to `false` for backward compatibility
2. **Elegance is Simplicity**: Single configuration option, no unnecessary complexity
3. **Performance is Art**: Metadata lookup cached per `assignInputsToNode()` call
4. **Error Handling as Philosophy**: Gracefully handles missing metadata with try-catch, falls back to single-value assignment

## Backward Compatibility

- Existing code without `isMulti` continues to work unchanged
- Default value is `false`, preserving single-value assignment behavior
- Errors in decorator metadata access don't break the system

## Testing

- `src/__tests__/decorator.test.ts` - Unit tests for decorator functionality
- `src/__tests__/data-flow-manager.test.ts` - Integration tests verify multi-input behavior works with DataFlowManager
- `src/__tests__/multi-input-example.ts` - Documented usage examples

## Files Modified

1. `packages/workflow-core/src/decorator.ts` - Core decorator implementation
2. `packages/workflow-core/src/execution/data-flow-manager.ts` - Runtime value assignment logic
3. `packages/workflow-core/src/index.ts` - Export new types and functions
