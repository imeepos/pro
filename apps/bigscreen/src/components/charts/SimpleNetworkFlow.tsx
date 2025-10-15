import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface NetworkUser {
  id: string;
  name: string;
  type: string;
  influence: number;
  followers: string;
  posts: number;
  engagement: string;
}

interface SimpleNetworkFlowProps {
  users: NetworkUser[];
  className?: string;
}

const SimpleNetworkFlow: React.FC<SimpleNetworkFlowProps> = ({ 
  users, 
  className = '' 
}) => {
  // 创建简单的节点
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // 中心节点
    nodes.push({
      id: 'center',
      position: { x: 200, y: 200 },
      data: { label: '热点事件' },
      style: {
        background: '#ef4444',
        color: 'white',
        border: '2px solid #dc2626',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
      },
    });

    // 用户节点
    users.forEach((user, index) => {
      const angle = (index * 2 * Math.PI) / users.length;
      const radius = 150;
      const x = 200 + Math.cos(angle) * radius;
      const y = 200 + Math.sin(angle) * radius;
      
      nodes.push({
        id: user.id,
        position: { x: x - 30, y: y - 30 },
        data: { 
          label: `${user.name}\n影响力: ${user.influence}` 
        },
        style: {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          width: 60,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          textAlign: 'center',
          padding: '4px',
        },
      });
    });

    return nodes;
  }, [users]);

  // 创建简单的边
  const initialEdges: Edge[] = useMemo(() => {
    return users.map((user) => ({
      id: `center-${user.id}`,
      source: 'center',
      target: user.id,
      type: 'straight',
      animated: true,
      style: {
        strokeWidth: 4,
        stroke: '#ef4444',
        strokeOpacity: 1,
      },
      label: `${user.influence}`,
      labelStyle: {
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#ef4444',
        background: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid #ef4444',
      },
    }));
  }, [users]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full bg-card/30 rounded-lg p-4 overflow-hidden" style={{ minHeight: '500px' }}>
        <h5 className="font-medium text-foreground mb-4 text-center">影响力传播网络 (简化版)</h5>
        
        <div className="w-full h-96 bg-white rounded-lg border-2 border-gray-300">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ 
              background: '#f8fafc',
              width: '100%',
              height: '100%'
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={2} 
              color="#e2e8f0"
            />
            <Controls />
          </ReactFlow>
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          如果您能看到红色连线，说明React Flow工作正常
        </div>
      </div>
    </div>
  );
};

export default SimpleNetworkFlow;
