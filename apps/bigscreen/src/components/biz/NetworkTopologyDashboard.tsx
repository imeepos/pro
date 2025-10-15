import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';
import { apiClient } from '@/services/api/apiClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NetworkTopologyDashboard');

/**
 * 根据节点大小计算层级（越大的节点层级越高，显示在前面）
 */
const getNodeLevel = (nodeSize: number): number => {
  if (nodeSize >= 60) return 10; // MainHub 最高层级
  if (nodeSize >= 40) return 8;  // 大节点
  if (nodeSize >= 25) return 6;  // 中等节点
  return 4; // 小节点
};

// ================== 类型定义 ==================

interface NetworkNode extends Node {
  type?: string;
  friendlyName?: string;
  nodeType?: string;
  gatewayNodeIds?: string[];
  connectivity?: string[];
}

interface NetworkEdge extends Edge {
  width?: number;
  color?: { color: string };
  smooth?: boolean;
  arrows?: { to: boolean };
}

interface TopologyData {
  data: Array<{
    Source: string;
    target: string;
    size?: number;
  }>;
}

interface NodeInfo {
  nodeId: string;
  friendlyName?: string;
  nodeType: string;
  gatewayNodeIds?: string[];
  connectivity?: string[];
  [key: string]: any;
}

interface NetworkTopologyDashboardProps {
  className?: string;
  customerId?: string;
  width?: string | number;
  height?: string | number;
  onNodeClick?: (nodeInfo: NodeInfo) => void;
}

// ================== 主组件 ==================

const NetworkTopologyDashboard: React.FC<NetworkTopologyDashboardProps> = ({
  className = '',
  customerId = '',
  width = '100%',
  height = '100%',
  onNodeClick
}) => {
  // ================== 状态管理 ==================
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 移除未使用的nodeInfo状态
  const [previousNodeId, setPreviousNodeId] = useState<string>('');

  // 统计数据
  const [statistics, setStatistics] = useState({
    efdTotal: 0,
    appTotal: 0,
    iotTotal: 0,
    cloudTotal: 0,
  });

  // ================== 网络配置 ==================
  const networkOptions = {
    autoResize: false,
    groups: {
      useDefaultGroups: true,
      myGroupId: {},
      ws: {
        shape: "dot",
        color: "white"
      }
    },
    nodes: {
      shape: "square",
      widthConstraint: 80,
      font: {
        size: 25,
        align: 'middle' as const,
      },
      color: {
        border: "#010E45",
        background: "#010E45",
        highlight: {
          border: "#010E45",
          background: "#010E45"
        },
        hover: {
          border: "#010E45",
          background: "#010E45"
        }
      },
      borderWidth: 1,
      borderWidthSelected: 1
    },
    edges: {
      width: 1,
      length: 260,
      color: {
        color: "#61a5e8",
        highlight: "#848484",
        hover: "#848484",
        inherit: "from" as const,
        opacity: 1.0
      },
      shadow: false,
      smooth: false,
      arrows: { to: false }
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -40000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.001,
        damping: 0.09,
        avoidOverlap: 0
      },
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 25
      },
      adaptiveTimestep: true
    },
    layout: {
      improvedLayout: false, // 禁用improvedLayout以提升性能
      randomSeed: 2
    },
    interaction: {
      hover: false,
      dragNodes: false,
      dragView: false,
      multiselect: true,
      selectable: true,
      selectConnectedEdges: true,
      hoverConnectedEdges: true,
      zoomView: true
    },
    manipulation: {
      enabled: false,
      addNode: true,
      addEdge: true,
      editEdge: true,
      deleteNode: true,
      deleteEdge: true
    }
  };

  // ================== 数据获取和处理 ==================

  /**
   * 获取拓扑数据
   */
  const fetchTopologyData = useCallback(async (id?: string) => {
    if (!id && !customerId) {
      logger.warn('No customer ID provided for topology data fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 使用API客户端获取数据
      const response = await apiClient.get<TopologyData>('/ble-mesh/topology', {
        params: { customerId: id || customerId },
        timeout: 15000
      });

      if (response.success && response.data) {
        // 处理数据格式：如果response.data是数组，包装成期望的格式
        const processedData = Array.isArray(response.data) 
          ? { data: response.data }
          : response.data;
        await processTopologyData(processedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取拓扑数据失败';
      logger.error('Failed to fetch topology data:', err);
      setError(errorMessage);
      
      // 使用模拟数据作为后备
      await processTopologyData(getMockTopologyData());
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  /**
   * 处理拓扑数据
   */
  const processTopologyData = useCallback(async (data: TopologyData) => {
    try {
      logger.debug('Processing topology data:', data);
      const nodes = await buildNodesArray(data);
      const edges = await buildEdgesArray(data);
      
      logger.debug('Generated nodes:', nodes.length);
      logger.debug('Generated edges:', edges.length);
      logger.debug('Nodes array:', nodes);
      logger.debug('Edges array:', edges);

      if (containerRef.current && nodes.length > 0) {
        const nodesDataSet = new DataSet(nodes);
        const edgesDataSet = new DataSet(edges);

        const networkData = {
          nodes: nodesDataSet,
          edges: edgesDataSet
        };

        // 销毁旧的网络实例
        if (networkRef.current) {
          networkRef.current.destroy();
        }

        // 创建新的网络实例
        networkRef.current = new Network(containerRef.current, networkData, networkOptions);
        
        // 绑定事件处理器
        bindNetworkEvents();
        
        // 保持物理引擎启用
        networkRef.current.on('stabilizationIterationsDone', () => {
          if (networkRef.current) {
            logger.debug('Physics stabilization complete, keeping physics enabled');
          }
        });
        
        logger.debug('Network topology created successfully');
      } else if (nodes.length === 0) {
        logger.warn('No nodes generated from topology data');
        setError('没有生成有效的网络节点');
      }
    } catch (err) {
      logger.error('Failed to process topology data:', err);
      setError('处理拓扑数据时发生错误');
    }
  }, []);

  /**
   * 构建节点数组 - 简化版本
   */
  const buildNodesArray = useCallback(async (data: TopologyData): Promise<NetworkNode[]> => {
    const nodes: NetworkNode[] = [];
    const nodeMap = new Map(); // 用于去重
    const efdCount = 0, appCount = 0, iotCount = 0, cloudCount = 0;

    // 处理数据中的所有节点，确保Source和target都被添加
    const dataArray = data.data && Array.isArray(data.data) ? data.data : [];
    
    if (dataArray.length > 0) {
      logger.debug('Processing data items:', dataArray.length);
      
      dataArray.forEach((item, index) => {
        logger.debug(`Processing item ${index}:`, item);
        
        // 添加Source节点
        if (item.Source && !nodeMap.has(item.Source)) {
          const size = typeof item.size === 'number' ? item.size : 0.1;
          const nodeSize = item.Source === "Pompeo" ? 260 : Math.max(15, size * 50);
          nodeMap.set(item.Source, true);
          
          const node = {
            id: item.Source,
            label: '', 
            type: item.Source,
            color: item.Source === "Pompeo" 
              ? { background: "#010E45" }
              : { background: "#1A4999" },
            shape: 'dot' as const,
            size: nodeSize,
            level: getNodeLevel(nodeSize),
            font: {
              color: '#ffffff',
              size: 0,
              face: 'Microsoft YaHei'
            },
            borderWidth: 2,
            borderWidthSelected: 3
          };
          nodes.push(node);
          logger.debug('Added Source node:', node);
        }
        
        // 添加target节点
        if (item.target && !nodeMap.has(item.target)) {
          const size = typeof item.size === 'number' ? item.size : 0.1;
          const nodeSize = Math.max(15, size * 50);
          nodeMap.set(item.target, true);
          
          const node = {
            id: item.target,
            label: '',
            type: item.target,
            color: { background: "#1A4999" },
            shape: 'dot' as const,
            size: nodeSize,
            level: getNodeLevel(nodeSize),
            font: {
              color: '#ffffff',
              size: 0,
              face: 'Microsoft YaHei'
            },
            borderWidth: 2,
            borderWidthSelected: 3
          };
          nodes.push(node);
          logger.debug('Added target node:', node);
        }
      });
    } else {
      logger.warn('No valid data array found. Data structure:', data);
      logger.warn('Data.data type:', typeof data.data);
    }

    // 更新统计数据
    setStatistics({
      efdTotal: efdCount,
      appTotal: appCount,
      iotTotal: iotCount,
      cloudTotal: cloudCount
    });

    logger.debug('Final nodes array:', nodes);
    return nodes;
  }, []);

  /**
   * 构建边数组 - 简化版本
   */
  const buildEdgesArray = useCallback(async (data: TopologyData): Promise<NetworkEdge[]> => {
    const edges: NetworkEdge[] = [];
    const dataArray = data.data && Array.isArray(data.data) ? data.data : [];

    if (dataArray.length > 0) {
      dataArray.forEach((item) => {
        if (item.Source && item.target) {
          edges.push({
            from: item.Source,
            to: item.target,
            label: "",
            width: 1,
            color: { color: "#10b981" }, // 固定绿色
            smooth: false
          });
        }
      });
    }

    logger.debug('Final edges array:', edges);
    return edges;
  }, []);

  /**
   * 绑定网络事件
   */
  const bindNetworkEvents = useCallback(() => {
    if (!networkRef.current) return;

    networkRef.current.on("click", (params) => {
      logger.debug('Network click event:', params);
      
      if (params.nodes.length > 0 && previousNodeId !== params.nodes[0]) {
        const nodeId = params.nodes[0] as string;
        fetchNodeDetails(nodeId);
        setPreviousNodeId(nodeId);
      }
    });

    networkRef.current.on("oncontext", (params) => {
      logger.debug('Network context menu event:', params);
    });
  }, [previousNodeId]);

  /**
   * 获取节点详情
   */
  const fetchNodeDetails = useCallback(async (nodeId: string) => {
    try {
      // 移除setNodeInfo调用

      // 尝试从API获取节点详情
      const response = await apiClient.get<NodeInfo>(`/topology/node/${nodeId}`, {
        params: { customerId },
        skipErrorHandler: true // 避免显示错误提示
      });

      if (response.success && response.data) {
        // 移除setNodeInfo，直接调用回调
        onNodeClick?.(response.data);
      }
    } catch (err) {
      // 如果API失败，创建基本的节点信息
      const basicNodeInfo: NodeInfo = {
        nodeId,
        nodeType: 'UNKNOWN',
        friendlyName: `Node ${nodeId}`
      };
      
      // 移除setNodeInfo，直接调用回调
      onNodeClick?.(basicNodeInfo);
      
      logger.debug('Using fallback node info for:', nodeId);
    }
  }, [customerId, onNodeClick]);

  /**
   * 获取模拟数据
   */
  const getMockTopologyData = (): TopologyData => {
    const mockData = [
      // 第一层：Pompeo的直接连接 (辐射状)
      { Source: "Pompeo", target: "Hub1", size: 0.4 },
      { Source: "Pompeo", target: "Hub2", size: 0.35 },
      { Source: "Pompeo", target: "Hub3", size: 0.3 },
      { Source: "Pompeo", target: "Hub4", size: 0.25 },
      { Source: "Pompeo", target: "Hub5", size: 0.2 },
      
      // 第二层：Hub的扩展连接
      { Source: "Hub1", target: "Node1A", size: 0.18 },
      { Source: "Hub1", target: "Node1B", size: 0.16 },
      { Source: "Hub1", target: "Node1C", size: 0.14 },
      { Source: "Hub2", target: "Node2A", size: 0.20 },
      { Source: "Hub2", target: "Node2B", size: 0.18 },
      { Source: "Hub3", target: "Node3A", size: 0.15 },
      { Source: "Hub3", target: "Node3B", size: 0.13 },
      { Source: "Hub3", target: "Node3C", size: 0.11 },
      { Source: "Hub4", target: "Node4A", size: 0.12 },
      { Source: "Hub4", target: "Node4B", size: 0.10 },
      { Source: "Hub5", target: "Node5A", size: 0.14 },
      
      // 第三层：叶子节点
      { Source: "Node1A", target: "Leaf1A", size: 0.08 },
      { Source: "Node1A", target: "Leaf1B", size: 0.07 },
      { Source: "Node1B", target: "Leaf1C", size: 0.06 },
      { Source: "Node2A", target: "Leaf2A", size: 0.09 },
      { Source: "Node2A", target: "Leaf2B", size: 0.08 },
      { Source: "Node2B", target: "Leaf2C", size: 0.07 },
      { Source: "Node3A", target: "Leaf3A", size: 0.06 },
      { Source: "Node3B", target: "Leaf3B", size: 0.05 },
      { Source: "Node4A", target: "Leaf4A", size: 0.05 },
      { Source: "Node5A", target: "Leaf5A", size: 0.06 },
      
      // 跨层连接 (会生成绿色特殊连线)
      { Source: "Node1A", target: "Node2B", size: 0.05 },
      { Source: "Node2A", target: "Node3A", size: 0.04 },
      { Source: "Node3B", target: "Node4A", size: 0.03 },
      { Source: "Hub1", target: "Node3A", size: 0.06 },
      { Source: "Hub2", target: "Node4B", size: 0.05 },
    ];
    
    logger.debug('Enhanced mock topology data generated:', mockData.length);
    return { data: mockData };
  };

  // ================== 生命周期 ==================

  useEffect(() => {
    fetchTopologyData();
    
    // 清理函数
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [fetchTopologyData]);

  // ================== 渲染 ==================

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <p className="text-red-500 mb-2">加载失败</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchTopologyData()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`} style={{ width, height }}>
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">正在加载拓扑数据...</p>
          </div>
        </div>
      )}

      {/* 网络容器 */}
      <div 
        ref={containerRef} 
        className="w-full"
        style={{ 
          height: '500px',
          minHeight: '500px',
          maxHeight: '500px',
          overflow: 'hidden'
        }}
      />

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Microsoft YaHei' }}>节点类型</div>
        <div className="space-y-2 text-xs" style={{ fontFamily: 'Microsoft YaHei' }}>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ 
              background: "#1e3a8a",
              border: "2px solid #1e40af"
            }}></div>
            <span className="text-gray-700 font-medium">核心节点 (MainHub)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ 
              background: "#1d4ed8",
              border: "1px solid #1e40af"
            }}></div>
            <span className="text-gray-600">高重要性节点</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ 
              background: "#2563eb",
              border: "1px solid #3b82f6"
            }}></div>
            <span className="text-gray-600">中等重要性节点 (0.15-0.3)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ 
              background: "#3b82f6",
              border: "1px solid #60a5fa"
            }}></div>
            <span className="text-gray-600">普通节点</span>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      {(statistics.efdTotal > 0 || statistics.appTotal > 0) && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Microsoft YaHei' }}>统计</div>
          <div className="space-y-1 text-xs" style={{ fontFamily: 'Microsoft YaHei' }}>
            <div>回声设备: {statistics.efdTotal}</div>
            <div>家电设备: {statistics.appTotal}</div>
            <div>IoT设备: {statistics.iotTotal}</div>
            <div>云服务: {statistics.cloudTotal}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkTopologyDashboard;