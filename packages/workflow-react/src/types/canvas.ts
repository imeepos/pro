import type { Node, Edge } from 'reactflow';

/**
 * 扩展 ReactFlow Node，添加工作流特定字段
 */
export interface WorkflowNode extends Node {
  data: {
    label: string;
    blueprintId: string;
    config: Record<string, unknown>;
    ports: {
      input: Port[];
      output: Port[];
    };
    validation?: {
      status: 'valid' | 'warning' | 'error';
      messages: string[];
    };
  };
}

/**
 * 端口定义
 */
export interface Port {
  id: string;
  name: string;
  kind: 'data' | 'control';
  dataType?: string;
  required?: boolean;
  multiple?: boolean;
}

/**
 * 扩展 ReactFlow Edge，添加工作流特定字段
 */
export type WorkflowEdge = Edge & {
  data?: {
    condition?: string;
    priority?: number;
    validation?: {
      status: 'valid' | 'error';
      message?: string;
    };
  };
};

/**
 * 蓝图定义（对应 workflow-core 的节点类型）
 */
export interface NodeBlueprint {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  ports: {
    input: Port[];
    output: Port[];
  };
  configSchema?: Record<string, unknown>; // Zod schema
}

/**
 * 画布状态
 */
export interface CanvasState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  blueprints: Record<string, NodeBlueprint>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  selection: {
    nodeIds: string[];
    edgeIds: string[];
  };
}

/**
 * 画布操作命令
 */
export type CanvasCommand =
  | { type: 'ADD_NODE'; payload: { blueprint: NodeBlueprint; position: { x: number; y: number } } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; changes: Partial<WorkflowNode['data']> } }
  | { type: 'ADD_EDGE'; payload: { source: string; target: string; sourceHandle?: string; targetHandle?: string } }
  | { type: 'DELETE_EDGE'; payload: { edgeId: string } }
  | { type: 'UPDATE_VIEWPORT'; payload: { x: number; y: number; zoom: number } };
