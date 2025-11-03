import { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type ReactFlowInstance,
  ConnectionMode,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '@/store/workflow-store';
import { WorkflowNodeComponent } from '@/nodes/WorkflowNode';
import { NodePalette } from './NodePalette';
import { Inspector } from './Inspector';
import { Toolbar } from './Toolbar';
import { ExecutionMonitor } from './ExecutionMonitor';
import type { NodeBlueprint, WorkflowEdge } from '@/types/canvas';

const nodeTypes = {
  workflow: WorkflowNodeComponent,
};

export const WorkflowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [draggedBlueprint, setDraggedBlueprint] = useState<NodeBlueprint | null>(null);
  const [showExecutionMonitor, setShowExecutionMonitor] = useState(false);

  const {
    nodes,
    edges,
    blueprints,
    executionState,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    initializeBlueprints
  } = useWorkflowStore();

  // 初始化蓝图
  useEffect(() => {
    initializeBlueprints();
  }, [initializeBlueprints]);

  const blueprintList = Object.values(blueprints);

  // 处理连接创建
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edgeId = `${connection.source}__${connection.target}`;
      const edge: WorkflowEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'smoothstep',
        data: {},
      };

      addEdge(edge);
    },
    [addEdge]
  );

  // 处理拖拽开始
  const onDragStart = useCallback((blueprint: NodeBlueprint) => {
    setDraggedBlueprint(blueprint);
  }, []);

  // 处理拖拽结束
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedBlueprint || !reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(draggedBlueprint, position);
      setDraggedBlueprint(null);
    },
    [draggedBlueprint, reactFlowInstance, addNode]
  );

  // 获取节点状态样式
  const getNodeClassName = (node: any) => {
    const baseClass = 'workflow-node';
    const nodeId = node.id;

    if (executionState.currentNodeIds.includes(nodeId)) {
      return `${baseClass} node-running`;
    }
    if (executionState.completedNodeIds.includes(nodeId)) {
      return `${baseClass} node-completed`;
    }
    if (executionState.errorNodeIds.includes(nodeId)) {
      return `${baseClass} node-error`;
    }
    return baseClass;
  };

  // 获取边样式
  const getEdgeClassName = (edge: any) => {
    const baseClass = 'workflow-edge';
    const sourceCompleted = executionState.completedNodeIds.includes(edge.source);
    const targetRunning = executionState.currentNodeIds.includes(edge.target);

    if (sourceCompleted && targetRunning) {
      return `${baseClass} edge-active`;
    }
    if (sourceCompleted) {
      return `${baseClass} edge-completed`;
    }
    return baseClass;
  };

  // API配置 - 在实际使用中应该从环境变量或配置文件获取
  const apiConfig = {
    baseUrl: process.env.REACT_APP_WORKFLOW_API_URL || 'http://localhost:3000',
    apiKey: process.env.REACT_APP_WORKFLOW_API_KEY,
    timeout: 30000,
    retryAttempts: 3
  };

  return (
    <div className="flex h-screen w-full">
      {/* 节点面板 */}
      <NodePalette blueprints={blueprintList} onDragStart={onDragStart} />

      {/* 主画布区域 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <Toolbar />

        {/* 执行监控按钮 */}
        <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => setShowExecutionMonitor(!showExecutionMonitor)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              showExecutionMonitor
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              executionState.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span>执行监控</span>
            {executionState.isRunning && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {Math.round(executionState.progress)}%
              </span>
            )}
          </button>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex">
          {/* ReactFlow 画布 */}
          <div className={`flex-1 bg-gray-100 ${showExecutionMonitor ? 'border-r border-gray-200' : ''}`}>
            <div ref={reactFlowWrapper} className="h-full" onDrop={onDrop} onDragOver={onDragOver}>
              <ReactFlow
                nodes={nodes.map(node => ({
                  ...node,
                  className: getNodeClassName(node)
                }))}
                edges={edges.map(edge => ({
                  ...edge,
                  className: getEdgeClassName(edge),
                  animated: executionState.currentNodeIds.includes(edge.target)
                }))}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-left"
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const nodeId = node.id;
                    if (executionState.errorNodeIds.includes(nodeId)) return '#ef4444';
                    if (executionState.currentNodeIds.includes(nodeId)) return '#3b82f6';
                    if (executionState.completedNodeIds.includes(nodeId)) return '#10b981';
                    return '#6b7280';
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </div>
          </div>

          {/* 执行监控面板 */}
          {showExecutionMonitor && (
            <div className="w-96 bg-white">
              <ExecutionMonitor
                apiConfig={apiConfig}
                onExecutionComplete={(response) => {
                  console.log('工作流执行完成:', response);
                }}
                onExecutionError={(error) => {
                  console.error('工作流执行失败:', error);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 属性面板 */}
      <Inspector />
    </div>
  );
};
