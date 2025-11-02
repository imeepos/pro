/**
 * Web Component 包装器
 * 用于在 Angular 应用中使用 React 工作流编辑器
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { useWorkflowStore } from './store/workflow-store';
import { serializeWorkflow, deserializeWorkflow } from './utils/workflow-serializer';
import { generateBlueprintsFromWorkflowCore } from './utils/blueprint-generator';

class WorkflowCanvasElement extends HTMLElement {
  private root: Root | null = null;
  private mountPoint: HTMLDivElement | null = null;

  static get observedAttributes() {
    return ['value'];
  }

  connectedCallback() {
    this.mountPoint = document.createElement('div');
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    this.appendChild(this.mountPoint);

    // 初始化 blueprints
    const blueprints = generateBlueprintsFromWorkflowCore();
    useWorkflowStore.getState().setState({ blueprints });

    this.root = createRoot(this.mountPoint);
    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.handleAttributeChange(name, newValue);
    }
  }

  private handleAttributeChange(name: string, value: string) {
    try {
      if (name === 'value') {
        const blueprints = useWorkflowStore.getState().blueprints;
        const { nodes, edges } = deserializeWorkflow(value, blueprints);
        useWorkflowStore.getState().setState({ nodes, edges });
      }
    } catch (error) {
      console.error(`Failed to parse attribute "${name}":`, error);
    }
  }

  private render() {
    if (!this.root) return;

    this.root.render(
      <WorkflowCanvasWrapper
        onChange={(json) => {
          // 触发自定义事件，通知 Angular
          this.dispatchEvent(
            new CustomEvent('change', {
              detail: { value: json },
              bubbles: true,
              composed: true,
            })
          );
        }}
      />
    );
  }

  getValue(): string {
    const { nodes, edges } = useWorkflowStore.getState();
    return serializeWorkflow(nodes, edges);
  }

  setValue(json: string): void {
    const blueprints = useWorkflowStore.getState().blueprints;
    const { nodes, edges } = deserializeWorkflow(json, blueprints);
    useWorkflowStore.getState().setState({ nodes, edges });
  }

  reset(): void {
    useWorkflowStore.getState().reset();
  }
}

function WorkflowCanvasWrapper({ onChange }: { onChange: (json: string) => void }) {
  React.useEffect(() => {
    const unsubscribe = useWorkflowStore.subscribe((state, prevState) => {
      if (state.nodes !== prevState.nodes || state.edges !== prevState.edges) {
        const json = serializeWorkflow(state.nodes, state.edges);
        onChange(json);
      }
    });
    return unsubscribe;
  }, [onChange]);

  return <WorkflowCanvas />;
}

// 注册 Web Component
if (!customElements.get('workflow-canvas')) {
  customElements.define('workflow-canvas', WorkflowCanvasElement);
}

export { WorkflowCanvasElement };
