import { useCallback, useRef, useState } from 'react';
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
import type { NodeBlueprint, WorkflowEdge } from '@/types/canvas';

const nodeTypes = {
  workflow: WorkflowNodeComponent,
};

export const WorkflowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [draggedBlueprint, setDraggedBlueprint] = useState<NodeBlueprint | null>(null);

  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const blueprints = useWorkflowStore((state) => state.blueprints);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const addNode = useWorkflowStore((state) => state.addNode);
  const addEdge = useWorkflowStore((state) => state.addEdge);
  const setSelection = useWorkflowStore((state) => state.setSelection);

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

  // 处理选择变化
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: any[]; edges: any[] }) => {
      setSelection(
        nodes.map((n) => n.id),
        edges.map((e) => e.id)
      );
    },
    [setSelection]
  );

  return (
    <div className="flex h-screen w-full">
      {/* 节点面板 */}
      <NodePalette blueprints={blueprintList} onDragStart={onDragStart} />

      {/* 主画布区域 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <Toolbar />

        {/* ReactFlow 画布 */}
        <div ref={reactFlowWrapper} className="flex-1 bg-gray-100" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onSelectionChange={onSelectionChange}
            connectionMode={ConnectionMode.Loose}
            fitView
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const status = (node.data as any)?.validation?.status;
                if (status === 'error') return '#ef4444';
                if (status === 'warning') return '#f59e0b';
                return '#3b82f6';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* 属性面板 */}
      <Inspector />
    </div>
  );
};
