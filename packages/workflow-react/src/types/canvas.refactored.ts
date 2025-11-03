import type { Node, Edge } from 'reactflow';
import type { z } from 'zod';

export interface ValidationResult {
  status: 'valid' | 'warning' | 'error';
  messages: string[];
}

export interface Port {
  id: string;
  name: string;
  kind: 'data' | 'control';
  dataType?: string;
  required?: boolean;
  allowMultipleConnections?: boolean;
}

export interface WorkflowNode extends Node {
  data: {
    label: string;
    blueprintId: string;
    config: Record<string, unknown>;
    ports: {
      input: Port[];
      output: Port[];
    };
    validation?: ValidationResult;
  };
}

export type WorkflowEdge = Edge & {
  data?: {
    condition?: string;
    priority?: number;
    validation?: ValidationResult;
  };
};

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
  configSchema?: z.ZodType;
}

export interface CanvasState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  blueprints: Record<string, NodeBlueprint>;
}
