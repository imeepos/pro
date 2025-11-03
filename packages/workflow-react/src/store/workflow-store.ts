import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { OnNodesChange, OnEdgesChange } from 'reactflow';
import type { WorkflowNode, WorkflowEdge, NodeBlueprint } from '@/types/canvas';
import type { WorkflowTemplate } from '@/templates/workflow-templates';
import { serializeWorkflow, deserializeWorkflow } from '@/utils/workflow-serializer';
import { getAllExtendedBlueprints } from '@/templates/node-definitions';

interface WorkflowStore {
  // 核心状态
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  blueprints: Record<string, NodeBlueprint>;

  // 工作流信息
  workflowInfo: {
    name?: string;
    description?: string;
    version?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  // 执行状态
  executionState: {
    isRunning: boolean;
    executionId?: string;
    progress: number;
    currentNodeIds: string[];
    completedNodeIds: string[];
    errorNodeIds: string[];
    logs: Array<{
      timestamp: string;
      nodeId: string;
      level: 'info' | 'warn' | 'error';
      message: string;
    }>;
  };

  // 节点操作
  addNode: (blueprint: NodeBlueprint, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, changes: Partial<WorkflowNode['data']>) => void;
  onNodesChange: OnNodesChange;

  // 连线操作
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (edgeId: string) => void;
  onEdgesChange: OnEdgesChange;

  // 模板操作
  loadTemplate: (template: WorkflowTemplate) => void;
  saveAsTemplate: (name: string, description: string, category: string, tags: string[]) => WorkflowTemplate;

  // 序列化操作
  exportWorkflow: (includeMetadata?: boolean) => string;
  importWorkflow: (json: string, options?: any) => { warnings?: string[] };

  // 执行操作
  startExecution: () => Promise<void>;
  stopExecution: () => void;
  updateExecutionProgress: (progress: number) => void;
  addExecutionLog: (nodeId: string, level: 'info' | 'warn' | 'error', message: string) => void;

  // 状态管理
  setState: (state: Partial<Pick<WorkflowStore, 'nodes' | 'edges' | 'blueprints' | 'workflowInfo'>>) => void;
  reset: () => void;
  initializeBlueprints: () => void;
}

const initialState = {
  nodes: [] as WorkflowNode[],
  edges: [] as WorkflowEdge[],
  blueprints: {} as Record<string, NodeBlueprint>,
  workflowInfo: {
    name: 'Untitled Workflow',
    description: '',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  executionState: {
    isRunning: false,
    progress: 0,
    currentNodeIds: [],
    completedNodeIds: [],
    errorNodeIds: [],
    logs: []
  }
};

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set, get) => ({
    ...initialState,

    // 初始化蓝图
    initializeBlueprints: () => {
      set((state) => {
        state.blueprints = getAllExtendedBlueprints();
      });
    },

    // 节点操作
    addNode: (blueprint, position) => {
      set((state) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNode: WorkflowNode = {
          id,
          type: 'workflow',
          position,
          data: {
            label: blueprint.name,
            blueprintId: blueprint.id,
            config: {},
            ports: {
              input: blueprint.ports.input,
              output: blueprint.ports.output,
            },
            validation: {
              status: 'valid',
              messages: []
            }
          },
        };
        state.nodes.push(newNode);
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    deleteNode: (nodeId) => {
      set((state) => {
        state.nodes = state.nodes.filter((n: WorkflowNode) => n.id !== nodeId);
        state.edges = state.edges.filter((e: WorkflowEdge) => e.source !== nodeId && e.target !== nodeId);
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    updateNode: (nodeId, changes) => {
      set((state) => {
        const node = state.nodes.find((n: WorkflowNode) => n.id === nodeId);
        if (node) {
          Object.assign(node.data, changes);
          state.workflowInfo.updatedAt = new Date().toISOString();
        }
      });
    },

    onNodesChange: (changes) => {
      set((state) => {
        const { applyNodeChanges } = require('reactflow');
        state.nodes = applyNodeChanges(changes, state.nodes) as WorkflowNode[];
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    // 连线操作
    addEdge: (edge) => {
      set((state) => {
        const exists = state.edges.some(
          (e: WorkflowEdge) =>
            e.source === edge.source &&
            e.target === edge.target &&
            e.sourceHandle === edge.sourceHandle &&
            e.targetHandle === edge.targetHandle
        );
        if (!exists) {
          state.edges.push(edge);
          state.workflowInfo.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteEdge: (edgeId) => {
      set((state) => {
        state.edges = state.edges.filter((e: WorkflowEdge) => e.id !== edgeId);
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const { applyEdgeChanges } = require('reactflow');
        state.edges = applyEdgeChanges(changes, state.edges) as WorkflowEdge[];
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    // 模板操作
    loadTemplate: (template) => {
      set((state) => {
        const { nodes, edges } = template.blueprint;

        // 生成新的节点ID以避免冲突
        const idMap: Record<string, string> = {};
        const newNodes = nodes.map(nodeData => {
          const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          idMap[nodeData.id] = newId;

          const blueprint = state.blueprints[nodeData.blueprintId] || {
            id: nodeData.blueprintId,
            name: nodeData.blueprintId,
            category: '未知',
            ports: { input: [], output: [] }
          };

          return {
            id: newId,
            type: 'workflow' as const,
            position: nodeData.position,
            data: {
              label: blueprint.name,
              blueprintId: nodeData.blueprintId,
              config: nodeData.config,
              ports: blueprint.ports,
              validation: {
                status: 'valid' as const,
                messages: []
              }
            }
          };
        });

        // 更新边的引用
        const newEdges = edges.map(edgeData => ({
          id: `${idMap[edgeData.source]}__${idMap[edgeData.target]}`,
          source: idMap[edgeData.source],
          target: idMap[edgeData.target],
          sourceHandle: edgeData.sourceHandle || undefined,
          targetHandle: edgeData.targetHandle || undefined,
          type: 'smoothstep' as const,
          data: edgeData.data || {}
        }));

        state.nodes = newNodes;
        state.edges = newEdges;
        state.workflowInfo.name = template.name;
        state.workflowInfo.description = template.description;
        state.workflowInfo.updatedAt = new Date().toISOString();
      });
    },

    saveAsTemplate: (name, description, category, tags) => {
      const { nodes, edges } = get();

      const template: WorkflowTemplate = {
        id: `template-${Date.now()}`,
        name,
        description,
        category: category as any,
        tags,
        blueprint: {
          nodes: nodes.map(node => ({
            id: node.id,
            blueprintId: node.data.blueprintId,
            position: node.position,
            config: node.data.config
          })),
          edges: edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: edge.data
          }))
        }
      };

      return template;
    },

    // 序列化操作
    exportWorkflow: (includeMetadata = true) => {
      const { nodes, edges, workflowInfo } = get();
      return serializeWorkflow(nodes, edges, workflowInfo.name, {
        includeMetadata,
        compressOutput: false,
        formatVersion: '1.0.0',
        encryptSensitiveData: true
      });
    },

    importWorkflow: (json, options = {}) => {
      const { blueprints } = get();
      try {
        const result = deserializeWorkflow(json, blueprints, {
          validateNodes: true,
          autoPositionNodes: true,
          createMissingBlueprints: true,
          migrateConfig: true,
          ...options
        });

        set((state) => {
          state.nodes = result.nodes;
          state.edges = result.edges;
          if (result.name) {
            state.workflowInfo.name = result.name;
          }
          if (result.metadata) {
            state.workflowInfo.version = result.metadata.formatVersion || '1.0.0';
            state.workflowInfo.createdAt = result.metadata.createdAt || new Date().toISOString();
          }
          state.workflowInfo.updatedAt = new Date().toISOString();
        });

        return { warnings: result.warnings };
      } catch (error) {
        throw new Error(`导入工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // 执行操作
    startExecution: async () => {
      const { nodes } = get();

      set((state) => {
        state.executionState.isRunning = true;
        state.executionState.executionId = `exec-${Date.now()}`;
        state.executionState.progress = 0;
        state.executionState.currentNodeIds = [];
        state.executionState.completedNodeIds = [];
        state.executionState.errorNodeIds = [];
        state.executionState.logs = [];
      });

      try {
        // 这里将集成实际的执行API
        // 暂时模拟执行过程
        const totalNodes = nodes.length;

        for (let i = 0; i < totalNodes; i++) {
          const node = nodes[i];

          // 更新当前执行节点
          set((state) => {
            state.executionState.currentNodeIds = [node.id];
            state.executionState.progress = (i + 1) / totalNodes * 100;
          });

          // 模拟节点执行时间
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 添加执行日志
          get().addExecutionLog(node.id, 'info', `执行节点: ${node.data.label}`);

          // 更新完成状态
          set((state) => {
            state.executionState.currentNodeIds = [];
            state.executionState.completedNodeIds.push(node.id);
          });
        }

        // 执行完成
        set((state) => {
          state.executionState.isRunning = false;
          state.executionState.progress = 100;
        });

        get().addExecutionLog('system', 'info', '工作流执行完成');
      } catch (error) {
        set((state) => {
          state.executionState.isRunning = false;
        });

        get().addExecutionLog('system', 'error', `执行失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },

    stopExecution: () => {
      set((state) => {
        state.executionState.isRunning = false;
        state.executionState.currentNodeIds = [];
      });

      get().addExecutionLog('system', 'warn', '工作流执行已停止');
    },

    updateExecutionProgress: (progress) => {
      set((state) => {
        state.executionState.progress = Math.max(0, Math.min(100, progress));
      });
    },

    addExecutionLog: (nodeId, level, message) => {
      set((state) => {
        state.executionState.logs.push({
          timestamp: new Date().toISOString(),
          nodeId,
          level,
          message
        });

        // 限制日志数量，避免内存溢出
        if (state.executionState.logs.length > 1000) {
          state.executionState.logs = state.executionState.logs.slice(-500);
        }
      });
    },

    // 状态管理
    setState: (newState) => {
      set((state) => {
        if (newState.nodes !== undefined) state.nodes = newState.nodes;
        if (newState.edges !== undefined) state.edges = newState.edges;
        if (newState.blueprints !== undefined) state.blueprints = newState.blueprints;
        if (newState.workflowInfo !== undefined) {
          Object.assign(state.workflowInfo, newState.workflowInfo);
          state.workflowInfo.updatedAt = new Date().toISOString();
        }
      });
    },

    reset: () => {
      set(initialState);
      get().initializeBlueprints();
    },
  }))
);
