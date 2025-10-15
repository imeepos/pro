import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
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
  avatar?: string;
}

interface InfluenceNetworkFlowProps {
  users: NetworkUser[];
  className?: string;
}

// 自定义用户节点组件
const UserNode = ({ data }: { data: any }) => {
  const { user } = data;
  const size = Math.max(50, (user.influence / 100) * 100);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case '官方账号': return 'from-red-500 to-red-600';
      case '媒体账号': return 'from-blue-500 to-blue-600';
      case 'KOL账号': return 'from-purple-500 to-purple-600';
      case '粉丝团体': return 'from-pink-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const generateAvatar = (name: string, type: string) => {
    const seed = encodeURIComponent(name);
    const style = type === '官方账号' ? 'avataaars' : 
                  type === '媒体账号' ? 'personas' :
                  type === 'KOL账号' ? 'adventurer' : 'micah';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=transparent`;
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative group cursor-pointer"
      style={{
        width: size,
        height: size,
        zIndex: 20 // 确保头像在连线上方
      }}
    >
      {/* 脉冲效果 */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      
      {/* Handle - 必须有才能连接边 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', border: '2px solid #fff' }}
      />

      {/* 用户头像 */}
      <div className="relative w-full h-full">
        <img
          src={generateAvatar(user.name, user.type)}
          alt={user.name}
          className="w-full h-full rounded-full border-4 border-white shadow-xl group-hover:shadow-2xl transition-all duration-300 bg-white group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full rounded-full border-4 border-white shadow-xl bg-gradient-to-br ${getTypeColor(user.type)} flex items-center justify-center text-white font-bold" style="font-size: ${size/4}px">
                  ${user.name.slice(1, 3)}
                </div>
              `;
            }
          }}
        />
        
        {/* 影响力指示器 */}
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ zIndex: 25 }}
        >
          {user.influence}
        </motion.div>

        {/* 用户类型标识 */}
        <div
          className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
            user.type === '官方账号' ? 'bg-red-500 text-white' :
            user.type === '媒体账号' ? 'bg-blue-500 text-white' :
            user.type === 'KOL账号' ? 'bg-purple-500 text-white' :
            user.type === '粉丝团体' ? 'bg-pink-500 text-white' :
            'bg-gray-500 text-white'
          }`}
          style={{ zIndex: 25 }}
        >
          {user.type}
        </div>
      </div>

      {/* 悬浮信息卡片 */}
      <div
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/95 text-white rounded-lg p-4 whitespace-nowrap shadow-2xl border border-white/20"
        style={{ zIndex: 100 }}
      >
        <div className="font-bold text-base mb-2">{user.name}</div>
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>类型:</span>
            <span className="text-white">{user.type}</span>
          </div>
          <div className="flex justify-between">
            <span>粉丝:</span>
            <span className="text-blue-400">{user.followers}</span>
          </div>
          <div className="flex justify-between">
            <span>贴子:</span>
            <span className="text-green-400">{user.posts} 条</span>
          </div>
          <div className="flex justify-between">
            <span>互动率:</span>
            <span className="text-yellow-400">{user.engagement}</span>
          </div>
          <div className="flex justify-between">
            <span>影响力:</span>
            <span className="text-red-400 font-bold">{user.influence}/100</span>
          </div>
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/95"></div>
      </div>
    </motion.div>
  );
};

// 中心事件节点组件
const CenterNode = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.5, type: "spring" }}
    className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-2xl border-4 border-white relative"
    style={{ zIndex: 25 }} // 中心节点z-index最高
  >
    {/* Handle - 作为源节点 */}
    <Handle
      type="source"
      position={Position.Right}
      style={{ background: '#555', border: '2px solid #fff' }}
    />

    <div className="text-center">
      <div className="text-base">热点</div>
      <div className="text-sm">事件</div>
    </div>

    {/* 多层脉冲效果 */}
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-400/50"
      animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
    />
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-300/30"
      animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
    />
  </motion.div>
);

const nodeTypes = {
  userNode: UserNode,
  centerNode: CenterNode,
};

const InfluenceNetworkFlow: React.FC<InfluenceNetworkFlowProps> = ({ 
  users, 
  className = '' 
}) => {
  // 创建节点数据
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // 中心事件节点
    nodes.push({
      id: 'center',
      type: 'centerNode',
      position: { x: 200, y: 150 },
      data: {},
      draggable: false,
    });

    // 用户节点 - 圆形布局
    users.forEach((user, index) => {
      const angle = (index * 2 * Math.PI) / users.length;
      const radius = 150;
      const x = 200 + Math.cos(angle) * radius;
      const y = 150 + Math.sin(angle) * radius;

      nodes.push({
        id: user.id,
        type: 'userNode',
        position: { x: x - 25, y: y - 25 },
        data: { user },
        draggable: true,
      });
    });

    return nodes;
  }, [users]);

  // 创建连线数据
  const initialEdges: Edge[] = useMemo(() => {
    return users.map((user, _index) => ({
      id: `center-${user.id}`,
      source: 'center',
      target: user.id,
      type: 'straight',
      animated: true,
      style: {
        strokeWidth: Math.max(4, user.influence / 20),
        stroke: '#ef4444',
        strokeOpacity: 1,
      },
      label: `${user.influence}`,
      labelStyle: {
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#3b82f6',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '2px 6px',
        borderRadius: '4px'
      },
      data: { influence: user.influence },
    }));
  }, [users]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className={`relative ${className}`}>
      {/* 确保React Flow边样式的CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .react-flow-edges-visible .react-flow__edges {
            z-index: 1 !important;
          }
          .react-flow-edges-visible .react-flow__nodes {
            z-index: 10 !important;
          }
          .react-flow-edges-visible .react-flow__node {
            z-index: 10 !important;
          }
          .react-flow-edges-visible .react-flow__edge path {
            stroke: #ef4444 !important;
            stroke-width: 3px !important;
            stroke-opacity: 1 !important;
          }
          .react-flow-edges-visible .react-flow__edge-text {
            fill: #ef4444 !important;
            font-weight: bold !important;
          }
        `
      }} />

      <div className="relative w-full bg-card/30 rounded-lg p-4 overflow-hidden" style={{ height: '500px' }}>
        <h5 className="font-medium text-foreground mb-4 text-center">影响力传播网络</h5>

        {/* React Flow 网络图 */}
        <div
          className="w-full h-96 bg-white rounded-lg border-2 border-gray-300"
          style={{
            // 确保React Flow样式不被覆盖
            '--rf-edge-stroke-default': '#ef4444',
            '--rf-edge-stroke-width-default': '3px',
            height: '100%', // 固定高度
          } as React.CSSProperties}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.5}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
            elementsSelectable={true}
            nodesConnectable={true}
            nodesDraggable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            style={{
              background: '#f8fafc',
              width: '100%',
              height: '100%'
            }}
            className="react-flow-edges-visible"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={2}
              color="#e2e8f0"
            />
            <Controls 
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'centerNode') return '#ef4444';
                return '#3b82f6';
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-black/50 border border-white/20"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default InfluenceNetworkFlow;
