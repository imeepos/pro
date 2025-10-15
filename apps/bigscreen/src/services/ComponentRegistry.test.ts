import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  componentRegistry,
  registerComponent,
  registerComponents,
  useComponentRegistry,
  useComponent,
  getComponentSafely,
} from './ComponentRegistry';

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('ComponentRegistry', () => {
  beforeEach(() => {
    componentRegistry.clear();
  });

  describe('componentRegistry', () => {
    it('should register a component successfully', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);

      expect(componentRegistry.has('TestComponent')).toBe(true);
      const registered = componentRegistry.get('TestComponent');
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('TestComponent');
      expect(registered?.component).toBe(TestComponent);
      expect(registered?.config).toEqual(config);
    });

    it('should warn when registering duplicate component', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);
      // Should not throw, but should warn
      componentRegistry.register('TestComponent', TestComponent, config);

      expect(componentRegistry.has('TestComponent')).toBe(true);
    });

    it('should validate component configuration', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const invalidConfig = {
        // Missing required fields
        category: 'test',
      } as any;

      expect(() => {
        componentRegistry.register('InvalidComponent', TestComponent, invalidConfig);
      }).toThrow('Invalid config for component InvalidComponent');
    });

    it('should get all registered components', () => {
      const TestComponent1 = () => React.createElement('div', null, 'Test1');
      const TestComponent2 = () => React.createElement('div', null, 'Test2');
      
      const config1 = {
        displayName: 'Test Component 1',
        category: 'test',
        description: 'First test component',
        icon: '1️⃣',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      const config2 = {
        displayName: 'Test Component 2',
        category: 'analytics',
        description: 'Second test component',
        icon: '2️⃣',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent1', TestComponent1, config1);
      componentRegistry.register('TestComponent2', TestComponent2, config2);

      const allComponents = componentRegistry.list();
      expect(allComponents).toHaveLength(2);
      
      const componentNames = allComponents.map(c => c.name);
      expect(componentNames).toContain('TestComponent1');
      expect(componentNames).toContain('TestComponent2');
    });

    it('should get components by category', () => {
      const TestComponent1 = () => React.createElement('div', null, 'Test1');
      const TestComponent2 = () => React.createElement('div', null, 'Test2');
      const TestComponent3 = () => React.createElement('div', null, 'Test3');
      
      const testConfig = {
        displayName: 'Test Component',
        category: 'test',
        description: 'Test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      const analyticsConfig = {
        ...testConfig,
        category: 'analytics',
        displayName: 'Analytics Component',
        icon: '📊',
      };

      componentRegistry.register('TestComponent1', TestComponent1, testConfig);
      componentRegistry.register('TestComponent2', TestComponent2, testConfig);
      componentRegistry.register('AnalyticsComponent', TestComponent3, analyticsConfig);

      const testComponents = componentRegistry.getByCategory('test');
      const analyticsComponents = componentRegistry.getByCategory('analytics');

      expect(testComponents).toHaveLength(2);
      expect(analyticsComponents).toHaveLength(1);
      
      expect(testComponents.map(c => c.name)).toContain('TestComponent1');
      expect(testComponents.map(c => c.name)).toContain('TestComponent2');
      expect(analyticsComponents.map(c => c.name)).toContain('AnalyticsComponent');
    });

    it('should unregister existing component', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);
      expect(componentRegistry.has('TestComponent')).toBe(true);

      componentRegistry.unregister('TestComponent');
      expect(componentRegistry.has('TestComponent')).toBe(false);
    });

    it('should handle unregistering non-existent component', () => {
      // Should not throw
      expect(() => componentRegistry.unregister('NonExistentComponent')).not.toThrow();
    });

    it('should get all categories', () => {
      const TestComponent1 = () => React.createElement('div', null, 'Test1');
      const TestComponent2 = () => React.createElement('div', null, 'Test2');
      
      const config1 = {
        displayName: 'Test Component 1',
        category: 'test',
        description: 'Test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      const config2 = {
        displayName: 'Analytics Component',
        category: 'analytics',
        description: 'Analytics component',
        icon: '📊',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent1', TestComponent1, config1);
      componentRegistry.register('TestComponent2', TestComponent2, config2);

      const categories = componentRegistry.getCategories();
      expect(categories).toContain('test');
      expect(categories).toContain('analytics');
      expect(categories).toHaveLength(2);
    });

    it('should clear all registered components', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent1', TestComponent, config);
      componentRegistry.register('TestComponent2', TestComponent, { ...config, displayName: 'Test 2' });

      expect(componentRegistry.size()).toBe(2);

      componentRegistry.clear();

      expect(componentRegistry.size()).toBe(0);
      expect(componentRegistry.list()).toHaveLength(0);
    });

    it('should return correct size', () => {
      expect(componentRegistry.size()).toBe(0);

      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);
      expect(componentRegistry.size()).toBe(1);
    });
  });

  describe('registerComponent decorator', () => {
    it('should register component via decorator', () => {
      const config = {
        displayName: 'Decorated Component',
        category: 'test',
        description: 'A decorated component',
        icon: '✨',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      const decorator = registerComponent('DecoratedComponent', config);
      const TestComponent = () => React.createElement('div', null, 'Decorated');
      
      const decoratedComponent = decorator(TestComponent);

      expect(decoratedComponent).toBe(TestComponent);
      expect(componentRegistry.has('DecoratedComponent')).toBe(true);
    });
  });

  describe('registerComponents utility', () => {
    it('should register multiple components', () => {
      const TestComponent1 = () => React.createElement('div', null, 'Test1');
      const TestComponent2 = () => React.createElement('div', null, 'Test2');
      
      const components = [
        {
          name: 'TestComponent1',
          component: TestComponent1,
          config: {
            displayName: 'Test Component 1',
            category: 'test',
            description: 'First test component',
            icon: '1️⃣',
            defaultSize: { w: 4, h: 3 },
            minSize: { w: 2, h: 2 },
            maxSize: { w: 8, h: 6 },
            defaultProps: {},
          },
        },
        {
          name: 'TestComponent2',
          component: TestComponent2,
          config: {
            displayName: 'Test Component 2',
            category: 'test',
            description: 'Second test component',
            icon: '2️⃣',
            defaultSize: { w: 4, h: 3 },
            minSize: { w: 2, h: 2 },
            maxSize: { w: 8, h: 6 },
            defaultProps: {},
          },
        },
      ];

      registerComponents(components);

      expect(componentRegistry.has('TestComponent1')).toBe(true);
      expect(componentRegistry.has('TestComponent2')).toBe(true);
    });
  });

  describe('useComponentRegistry hook', () => {
    it('should provide registry methods', () => {
      const { result } = renderHook(() => useComponentRegistry());

      expect(result.current.register).toBeDefined();
      expect(result.current.get).toBeDefined();
      expect(result.current.list).toBeDefined();
      expect(result.current.getByCategory).toBeDefined();
      expect(result.current.unregister).toBeDefined();
      expect(result.current.has).toBeDefined();
      expect(result.current.getCategories).toBeDefined();
    });

    it('should work with registry methods', () => {
      const { result } = renderHook(() => useComponentRegistry());
      
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      result.current.register('TestComponent', TestComponent, config);

      expect(result.current.has('TestComponent')).toBe(true);
      const retrieved = result.current.get('TestComponent');
      expect(retrieved?.name).toBe('TestComponent');
    });
  });

  describe('useComponent hook', () => {
    it('should get registered component', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);

      const { result } = renderHook(() => useComponent('TestComponent'));

      expect(result.current).toBeDefined();
      expect(result.current?.component).toBe(TestComponent);
    });

    it('should return undefined for unregistered component', () => {
      const { result } = renderHook(() => useComponent('NonExistentComponent'));

      expect(result.current).toBeUndefined();
    });
  });

  describe('getComponentSafely utility', () => {
    it('should return component for registered name', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const config = {
        displayName: 'Test Component',
        category: 'test',
        description: 'A test component',
        icon: '🧪',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 2, h: 2 },
        maxSize: { w: 8, h: 6 },
        defaultProps: {},
      };

      componentRegistry.register('TestComponent', TestComponent, config);

      const retrieved = getComponentSafely('TestComponent');
      expect(retrieved).toBe(TestComponent);
    });

    it('should return null for unregistered component', () => {
      const retrieved = getComponentSafely('NonExistentComponent');
      expect(retrieved).toBeNull();
    });
  });
});