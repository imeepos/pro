import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Save, 
  Plus, 
  Download, 
  RotateCcw,
  Edit3,
  Eye
} from 'lucide-react';
import { GridContainer, GridItem } from './GridContainer';
import { useLayoutStore, WidgetConfig } from '../../stores/useLayoutStore';
import { twMerge } from 'tailwind-merge';
import { legacyComponentMap as componentMap } from './LayoutComponentProvider';

export const LayoutEditor: React.FC = () => {
  const {
    currentLayout,
    availableWidgets,
    isEditMode,
    updateGridItems,
    addGridItem,
    toggleEditMode,
    saveLayout,
    resetToDefault
  } = useLayoutStore();

  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);

  const handleLayoutChange = useCallback((items: GridItem[]) => {
    updateGridItems(items);
  }, [updateGridItems]);

  const handleAddWidget = useCallback((widget: WidgetConfig) => {
    if (!currentLayout) return;

    // 找到合适的位置放置新组件
    const occupiedPositions = new Set(
      currentLayout.items.flatMap(item => 
        Array.from({ length: item.h }, (_, y) =>
          Array.from({ length: item.w }, (_, x) => `${item.x + x},${item.y + y}`)
        ).flat()
      )
    );

    let bestPosition = { x: 0, y: 0 };
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= currentLayout.cols - widget.defaultSize.w; x++) {
        const positions = Array.from({ length: widget.defaultSize.h }, (_, dy) =>
          Array.from({ length: widget.defaultSize.w }, (_, dx) => `${x + dx},${y + dy}`)
        ).flat();

        if (positions.every(pos => !occupiedPositions.has(pos))) {
          bestPosition = { x, y };
          break;
        }
      }
      if (bestPosition.x !== 0 || bestPosition.y !== 0) break;
    }

    if (componentMap[widget.component]) {
      addGridItem({
        x: bestPosition.x,
        y: bestPosition.y,
        w: widget.defaultSize.w,
        h: widget.defaultSize.h,
        component: widget.component,
        props: widget.defaultProps || {},
        minW: widget.minSize?.w,
        minH: widget.minSize?.h,
        maxW: widget.maxSize?.w,
        maxH: widget.maxSize?.h
      });
    }

    setShowWidgetPanel(false);
  }, [currentLayout, addGridItem]);

  const handleSaveLayout = useCallback(() => {
    if (currentLayout) {
      saveLayout(currentLayout);
      // 可以添加保存成功的提示
    }
  }, [currentLayout, saveLayout]);

  const handleExportLayout = useCallback(() => {
    if (currentLayout) {
      const dataStr = JSON.stringify(currentLayout, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentLayout.name}-layout.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [currentLayout]);

  if (!currentLayout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载布局中...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {currentLayout.name}
          </h2>
          <span className="text-sm text-gray-500">
            {isEditMode ? '编辑模式' : '预览模式'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleEditMode}
            className={twMerge(
              'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors',
              isEditMode 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {isEditMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{isEditMode ? '编辑' : '预览'}</span>
          </button>

          {isEditMode && (
            <>
              <button
                onClick={() => setShowWidgetPanel(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加组件</span>
              </button>

              <button
                onClick={() => setShowLayoutSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="布局设置"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveLayout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="保存布局"
              >
                <Save className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportLayout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出布局"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={resetToDefault}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="重置为默认"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 布局画布 */}
      <div className="flex-1 p-4 bg-gray-50 overflow-auto">
        <GridContainer
          items={currentLayout.items.map(item => ({
            ...item,
            component: typeof item.component === 'string' 
              ? componentMap[item.component as keyof typeof componentMap] || componentMap['StatsOverview']
              : item.component
          }))}
          onLayoutChange={handleLayoutChange}
          cols={currentLayout.cols}
          rowHeight={currentLayout.rowHeight}
          gap={currentLayout.gap}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          className="min-h-full"
        />
      </div>

      {/* 组件面板 */}
      <AnimatePresence>
        {showWidgetPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowWidgetPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-96 max-h-96 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">添加组件</h3>
              </div>
              
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {availableWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => handleAddWidget(widget)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{widget.icon}</span>
                      <div>
                        <div className="font-medium">{widget.name}</div>
                        <div className="text-sm text-gray-500">{widget.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 布局设置面板 */}
      <AnimatePresence>
        {showLayoutSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowLayoutSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">布局设置</h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    布局名称
                  </label>
                  <input
                    type="text"
                    value={currentLayout.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入布局名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    网格列数
                  </label>
                  <input
                    type="number"
                    value={currentLayout.cols}
                    min="1"
                    max="24"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    行高 (px)
                  </label>
                  <input
                    type="number"
                    value={currentLayout.rowHeight}
                    min="50"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={() => setShowLayoutSettings(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowLayoutSettings(false)}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};