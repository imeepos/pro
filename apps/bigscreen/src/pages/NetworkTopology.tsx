import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { NetworkTopologyDashboard } from '@/components/biz';
import { RefreshCw, Settings, Search, Info } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NetworkTopology');

// ================== 类型定义 ==================

interface NodeInfo {
  nodeId: string;
  friendlyName?: string;
  nodeType: string;
  gatewayNodeIds?: string[];
  connectivity?: string[];
  [key: string]: any;
}

interface NetworkTopologyProps {
  className?: string;
}

// ================== 主组件 ==================

const NetworkTopology: React.FC<NetworkTopologyProps> = ({ className = '' }) => {
  // ================== 状态管理 ==================
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [customerId, setCustomerId] = useState<string>('demo-customer-001');
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // ================== 事件处理 ==================

  /**
   * 处理节点点击事件
   */
  const handleNodeClick = useCallback((nodeInfo: NodeInfo) => {
    logger.debug('Node clicked:', nodeInfo);
    setSelectedNode(nodeInfo);
  }, []);

  /**
   * 处理刷新操作
   */
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 这里可以添加刷新逻辑
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('Network topology refreshed');
    } catch (error) {
      logger.error('Failed to refresh network topology:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 处理搜索操作
   */
  const handleSearch = useCallback(() => {
    if (searchValue.trim()) {
      setCustomerId(searchValue.trim());
      logger.info('Searching for customer:', searchValue);
    }
  }, [searchValue]);

  /**
   * 处理键盘事件
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // ================== 渲染节点信息面板 ==================
  const renderNodeInfoPanel = () => {
    if (!selectedNode) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">选择一个节点</p>
            <p className="text-sm">点击拓扑图中的节点查看详细信息</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 节点基本信息 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 font-['Microsoft_YaHei']">
            节点信息
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">节点ID:</span>
              <span className="text-sm font-medium text-gray-800">{selectedNode.nodeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">类型:</span>
              <span className="text-sm font-medium text-gray-800">{selectedNode.nodeType}</span>
            </div>
            {selectedNode.friendlyName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">友好名称:</span>
                <span className="text-sm font-medium text-gray-800">{selectedNode.friendlyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* 连接信息 */}
        {selectedNode.gatewayNodeIds && selectedNode.gatewayNodeIds.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-md font-medium text-gray-800 mb-2 font-['Microsoft_YaHei']">
              网关连接
            </h4>
            <div className="space-y-1">
              {selectedNode.gatewayNodeIds.map((gatewayId, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {gatewayId}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 连接协议 */}
        {selectedNode.connectivity && selectedNode.connectivity.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-md font-medium text-gray-800 mb-2 font-['Microsoft_YaHei']">
              连接协议
            </h4>
            <div className="space-y-1">
              {selectedNode.connectivity.map((protocol, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {protocol}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 其他属性 */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2 font-['Microsoft_YaHei']">
            其他属性
          </h4>
          <div className="space-y-1">
            {Object.entries(selectedNode).map(([key, value]) => {
              if (['nodeId', 'nodeType', 'friendlyName', 'gatewayNodeIds', 'connectivity'].includes(key)) {
                return null;
              }
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-gray-600">{key}:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ================== 渲染 ==================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`w-full h-full space-y-6 ${className}`}
    >
      {/* 页面标题和工具栏 */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-['Microsoft_YaHei']">
              智能家居网络拓扑
            </h1>
            <p className="text-gray-600 mt-1">
              可视化展示智能家居设备的网络连接关系
            </p>
          </div>
          
          {/* 工具栏 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入客户ID进行搜索"
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            当前客户: <span className="font-medium">{customerId}</span>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* 拓扑图 */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-['Microsoft_YaHei']">
                网络拓扑图
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <NetworkTopologyDashboard
                customerId={customerId}
                onNodeClick={handleNodeClick}
                className="w-full h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* 信息面板 */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-['Microsoft_YaHei']">
                节点详情
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)] overflow-y-auto">
              {renderNodeInfoPanel()}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default NetworkTopology;