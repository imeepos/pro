import React, { useState, useCallback } from 'react';
import BleMeshNetworkChart from './BleMeshNetworkChart';

interface BleMeshTopologyDashboardProps {
  className?: string;
}

const BleMeshTopologyDashboard: React.FC<BleMeshTopologyDashboardProps> = ({ 
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 模拟刷新数据
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={`w-full h-full bg-white ${className}`}>
      {/* 主内容区域 */}
      <div className="flex-1 p-4 h-full">
        <div className="grid grid-cols-12 gap-6 h-full">
            
            {/* 左侧 - BLE Mesh可达性 */}
            <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 font-['Microsoft_YaHei']">
                  蓝牙网格可达性
                </h2>
              </div>
              <div className="p-4" style={{ height: '600px' }}>
                <BleMeshNetworkChart
                  type="reachability"
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                  customerId="demo"
                  maxNodes={300}
                  enableVirtualization={true}
                />
              </div>
              {/* 图例 */}
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4 text-sm font-['Microsoft_YaHei']">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">回声节点</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">单跳/多跳</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">普通节点</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BleMeshTopologyDashboard;