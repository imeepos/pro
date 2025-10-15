import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutStore, type LayoutConfig } from '../stores/useLayoutStore';
import { LayoutDesigner } from '../components/layout/LayoutDesigner';
import { DataOverviewRenderer } from '../components/layout/DataOverviewRenderer';

const CustomDataOverview: React.FC = () => {
  const { 
    currentLayout, 
    isEditMode, 
    setEditMode,
    saveLayout 
  } = useLayoutStore();

  // 保存布局后的回调
  const handleLayoutSaved = (layout: LayoutConfig) => {
    saveLayout(layout);
    setEditMode(false);
  };


  return (
    <div className="h-full flex flex-col bg-background">
      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* 数据展示模式 */}
          {!isEditMode && currentLayout && (
            <motion.div
              key="view-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-2"
            >
              <DataOverviewRenderer layout={currentLayout} />
            </motion.div>
          )}

          {/* 空布局提示 */}
          {!isEditMode && !currentLayout && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">暂无选中布局</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  请点击顶部设置按钮选择或创建布局
                </p>
              </div>
            </motion.div>
          )}

          {/* 布局设计模式 */}
          {isEditMode && (
            <motion.div
              key="design-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <LayoutDesigner
                onSave={handleLayoutSaved}
                onCancel={() => setEditMode(false)}
                initialLayout={currentLayout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomDataOverview;