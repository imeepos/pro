import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components';
import DataOverview from '@/pages/DataOverview';
import CustomDataOverview from '@/pages/CustomDataOverview';
import EventAnalysis from '@/pages/EventAnalysis';
import EventDetail from '@/pages/EventDetail';
import UserDetection from '@/pages/UserDetection';
import { LayoutDemo } from '@/pages/LayoutDemo';
import BleMeshTopology from '@/pages/BleMeshTopology';
import NetworkTopology from '@/pages/NetworkTopology';
import WorkflowEditor from '@/pages/WorkflowEditor';
import WorkflowDemo from '@/pages/WorkflowDemo';
import { useTheme } from '@/hooks/useTheme';
import { cn, createLogger } from '@/utils';
import { useWebSocket, useRealTimeData, useAutoRefresh } from '@/hooks';
import { initializeApp, runHealthCheck } from '@/services/appInitialization';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ToastProvider } from '@/components/ui/Toast';

const logger = createLogger('App');

const App: React.FC = () => {
  const { theme } = useTheme();
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // 应用初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeApp();
        
        // 运行健康检查
        const healthCheck = runHealthCheck();
        if (!healthCheck.healthy) {
          logger.warn('Health check failed', healthCheck.issues);
        } else {
          logger.info('Application initialized successfully');
        }
        
        setIsAppInitialized(true);
      } catch (error) {
        logger.error('App initialization failed', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    initialize();
  }, []);

  // 初始化 WebSocket 连接（仅在应用初始化完成后）
  useWebSocket({
    autoConnect: isAppInitialized,
    reconnectOnClose: true,
    maxReconnectAttempts: 5,
  });

  // 初始化数据获取（仅在应用初始化完成后）
  const { refreshData } = useRealTimeData({
    autoRefresh: isAppInitialized,
    refreshInterval: 30000,
  });

  // 自动刷新（仅在应用初始化完成后）
  useAutoRefresh({
    onRefresh: refreshData,
    interval: 30000,
    enabled: isAppInitialized,
    immediate: false,
  });

  // 显示初始化错误
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">应用初始化失败</h1>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 显示加载状态
  if (!isAppInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" text="正在初始化应用..." />
          <p className="text-gray-500 mt-4">正在注册组件和配置系统...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <div className={cn(
          'min-h-screen transition-colors duration-300',
          theme === 'dark' ? 'dark' : ''
        )}>
          <Layout>
            <AnimatePresence mode="wait">
              <Routes>
              {/* 新的主要功能页面 */}
              <Route
                path="/"
                element={
                  <motion.div
                    key="data-overview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DataOverview />
                  </motion.div>
                }
              />
              <Route
                path="/data-overview"
                element={
                  <motion.div
                    key="data-overview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DataOverview />
                  </motion.div>
                }
              />
              <Route
                path="/event-analysis"
                element={
                  <motion.div
                    key="event-analysis"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EventAnalysis />
                  </motion.div>
                }
              />
              <Route
                path="/event-analysis/:eventId"
                element={
                  <motion.div
                    key="event-detail"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EventDetail />
                  </motion.div>
                }
              />
              <Route
                path="/user-detection"
                element={
                  <motion.div
                    key="user-detection"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <UserDetection />
                  </motion.div>
                }
              />
              <Route
                path="/custom-overview"
                element={
                  <motion.div
                    key="custom-overview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CustomDataOverview />
                  </motion.div>
                }
              />
              <Route
                path="/layout-editor"
                element={
                  <motion.div
                    key="layout-editor"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LayoutDemo />
                  </motion.div>
                }
              />
              <Route
                path="/ble-mesh-topology"
                element={
                  <motion.div
                    key="ble-mesh-topology"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BleMeshTopology />
                  </motion.div>
                }
              />
              <Route
                path="/network-topology"
                element={
                  <motion.div
                    key="network-topology"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NetworkTopology />
                  </motion.div>
                }
              />
              <Route
                path="/workflow-editor"
                element={
                  <motion.div
                    key="workflow-editor"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <WorkflowEditor />
                  </motion.div>
                }
              />
              <Route
                path="/workflow-demo"
                element={
                  <motion.div
                    key="workflow-demo"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <WorkflowDemo />
                  </motion.div>
                }
              />
              </Routes>
            </AnimatePresence>
          </Layout>
        </div>
      </Router>
    </ToastProvider>
  );
};

export default App;
