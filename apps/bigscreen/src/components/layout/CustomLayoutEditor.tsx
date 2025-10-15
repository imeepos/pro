import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Edit, 
  Move, 
  Square,
  Maximize2,
  Grid,
  Save,
  Undo,
  Redo,
  Settings
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { LayoutArea } from '../../stores/useLayoutStore';
import { renderComponent } from './LayoutComponentProvider';

interface CustomLayoutEditorProps {
  initialAreas?: LayoutArea[];
  cols?: number;
  initialName?: string;
  initialDescription?: string;
  onSave?: (areas: LayoutArea[], config: { cols: number; name: string; description: string }) => void;
  onCancel?: () => void;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize' | 'create';
  startPosition: { x: number; y: number };
  targetArea?: LayoutArea;
  originalArea?: LayoutArea;
}

interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CustomLayoutEditor: React.FC<CustomLayoutEditorProps> = ({
  initialAreas = [],
  cols = 12,
  initialName = '自定义布局',
  initialDescription = '用户自定义创建的布局',
  onSave,
  onCancel,
  className
}) => {
  const [areas, setAreas] = useState<LayoutArea[]>(initialAreas);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: 'move',
    startPosition: { x: 0, y: 0 }
  });
  const [history, setHistory] = useState<LayoutArea[][]>([initialAreas]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState({
    cols,
    name: initialName,
    description: initialDescription
  });
  const [showSettings, setShowSettings] = useState(false);
  const [previewGrid, setPreviewGrid] = useState<GridPosition | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // 添加到历史记录
  const addToHistory = useCallback((newAreas: LayoutArea[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAreas]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAreas([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAreas([...history[historyIndex + 1]]);
    }
  }, [history, historyIndex]);

  // 获取网格位置
  const getGridPosition = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!gridRef.current) return { x: 0, y: 0 };
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * layoutConfig.cols);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 20); // 假设最大20行
    
    return {
      x: Math.max(0, Math.min(x, layoutConfig.cols - 1)),
      y: Math.max(0, y)
    };
  }, [layoutConfig.cols]);

  // 检查区域是否重叠
  const checkOverlap = useCallback((newArea: GridPosition, excludeId?: string): boolean => {
    return areas.some(area => {
      if (excludeId && area.id === excludeId) return false;
      
      return !(
        newArea.x >= area.x + area.w ||
        newArea.x + newArea.w <= area.x ||
        newArea.y >= area.y + area.h ||
        newArea.y + newArea.h <= area.y
      );
    });
  }, [areas]);

  // 生成新的区域ID
  const generateAreaId = useCallback((): string => {
    return `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 开始拖拽创建新区域
  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === gridRef.current) {
      const position = getGridPosition(e.clientX, e.clientY);
      setDragState({
        isDragging: true,
        dragType: 'create',
        startPosition: position
      });
      setPreviewGrid({ x: position.x, y: position.y, w: 1, h: 1 });
    }
  }, [getGridPosition]);

  // 拖拽过程中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const currentPosition = getGridPosition(e.clientX, e.clientY);

    if (dragState.dragType === 'create') {
      const startPos = dragState.startPosition;
      const newGrid: GridPosition = {
        x: Math.min(startPos.x, currentPosition.x),
        y: Math.min(startPos.y, currentPosition.y),
        w: Math.abs(currentPosition.x - startPos.x) + 1,
        h: Math.abs(currentPosition.y - startPos.y) + 1
      };
      
      // 确保不超出边界
      newGrid.w = Math.min(newGrid.w, layoutConfig.cols - newGrid.x);
      
      setPreviewGrid(newGrid);
    } else if (dragState.dragType === 'move' && dragState.targetArea) {
      const offset = {
        x: currentPosition.x - dragState.startPosition.x,
        y: currentPosition.y - dragState.startPosition.y
      };
      
      const newPosition = {
        x: Math.max(0, Math.min(dragState.originalArea!.x + offset.x, layoutConfig.cols - dragState.targetArea.w)),
        y: Math.max(0, dragState.originalArea!.y + offset.y)
      };
      
      setAreas(prev => prev.map(area => 
        area.id === dragState.targetArea!.id 
          ? { ...area, x: newPosition.x, y: newPosition.y }
          : area
      ));
    }
  }, [dragState, getGridPosition, layoutConfig.cols]);

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    if (dragState.dragType === 'create' && previewGrid) {
      // 检查是否有重叠
      if (!checkOverlap(previewGrid)) {
        const newArea: LayoutArea = {
          id: generateAreaId(),
          title: `区域 ${areas.length + 1}`,
          name: `区域 ${areas.length + 1}`,
          x: previewGrid.x,
          y: previewGrid.y,
          w: previewGrid.w,
          h: previewGrid.h,
          component: null,
          type: 'widget',
          placeholder: '点击选择组件'
        };
        
        const newAreas = [...areas, newArea];
        setAreas(newAreas);
        addToHistory(newAreas);
        setSelectedArea(newArea.id);
      }
    } else if (dragState.dragType === 'move' && dragState.targetArea) {
      addToHistory(areas);
    }

    setDragState({
      isDragging: false,
      dragType: 'move',
      startPosition: { x: 0, y: 0 }
    });
    setPreviewGrid(null);
  }, [dragState, previewGrid, checkOverlap, generateAreaId, areas, addToHistory]);

  // 开始移动区域
  const handleAreaMouseDown = useCallback((e: React.MouseEvent, area: LayoutArea) => {
    e.stopPropagation();
    const position = getGridPosition(e.clientX, e.clientY);
    setDragState({
      isDragging: true,
      dragType: 'move',
      startPosition: position,
      targetArea: area,
      originalArea: { ...area }
    });
    setSelectedArea(area.id);
  }, [getGridPosition]);

  // 删除区域
  const handleDeleteArea = useCallback((areaId: string) => {
    const newAreas = areas.filter(area => area.id !== areaId);
    setAreas(newAreas);
    addToHistory(newAreas);
    setSelectedArea(null);
  }, [areas, addToHistory]);

  // 编辑区域属性
  const handleEditArea = useCallback((areaId: string, updates: Partial<LayoutArea>) => {
    const newAreas = areas.map(area => 
      area.id === areaId ? { ...area, ...updates } : area
    );
    setAreas(newAreas);
    addToHistory(newAreas);
  }, [areas, addToHistory]);

  // 调整区域大小
  const handleResizeArea = useCallback((areaId: string, newSize: { w: number; h: number }) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const newArea = { ...area, ...newSize };
    
    // 确保不超出边界
    newArea.w = Math.min(newArea.w, layoutConfig.cols - newArea.x);
    
    // 检查重叠
    if (!checkOverlap(newArea, areaId)) {
      handleEditArea(areaId, newSize);
    }
  }, [areas, layoutConfig.cols, checkOverlap, handleEditArea]);

  // 保存布局
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(areas, layoutConfig);
    }
  }, [areas, layoutConfig, onSave]);

  // 监听鼠标事件
  React.useEffect(() => {
    if (dragState.isDragging) {
      // 禁用文本选择
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={twMerge(
      'h-full flex flex-col bg-gray-50', 
      dragState.isDragging && 'select-none',
      className
    )}>
      {/* 工具栏 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">自定义布局编辑器</h2>
            <p className="text-sm text-gray-600">拖拽创建区域，设计你的专属布局</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* 历史操作 */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="撤销"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="重做"
            >
              <Redo className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* 设置 */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="布局设置"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* 保存和取消 */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>保存布局</span>
            </button>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border-b px-6 py-3">
        <div className="flex items-center space-x-4 text-sm text-blue-700">
          <div className="flex items-center space-x-1">
            <Square className="w-4 h-4" />
            <span>在网格上拖拽创建新区域</span>
          </div>
          <div className="flex items-center space-x-1">
            <Move className="w-4 h-4" />
            <span>拖拽区域标题可移动位置</span>
          </div>
          <div className="flex items-center space-x-1">
            <Maximize2 className="w-4 h-4" />
            <span>拖拽区域边角可调整大小</span>
          </div>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 p-6 overflow-auto">
        {/* 网格容器 */}
        <div
          ref={gridRef}
          className={twMerge(
            "relative bg-gray-50 border border-gray-200 rounded-lg min-h-[600px] transition-all duration-200 select-none",
            dragState.isDragging && dragState.dragType === 'create' 
              ? "cursor-crosshair bg-blue-50/40 border-blue-200" 
              : "cursor-crosshair hover:bg-blue-50/20 hover:border-blue-100"
          )}
          style={{
            cursor: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' stroke='%23000' stroke-width='1.5'%3e%3cpath d='M10 1v18M1 10h18'/%3e%3c/g%3e%3c/svg%3e") 10 10, crosshair`,
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: `${100 / layoutConfig.cols}% 30px`,
            boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.1)'
          }}
          onMouseDown={handleGridMouseDown}
        >
          {/* 网格线 */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layoutConfig.cols}, 1fr)`,
              gridTemplateRows: 'repeat(20, 30px)',
              gap: '1px'
            }}
          >
            {Array.from({ length: layoutConfig.cols * 20 }).map((_, i) => (
              <div key={i} className="border border-gray-100"></div>
            ))}
          </div>

          {/* 预览区域 */}
          {previewGrid && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={twMerge(
                'absolute border-2 border-blue-400 bg-blue-50 bg-opacity-80 rounded-lg pointer-events-none shadow-sm backdrop-blur-sm',
                checkOverlap(previewGrid) && 'border-red-400 bg-red-50'
              )}
              style={{
                left: `${(previewGrid.x / layoutConfig.cols) * 100}%`,
                top: `${previewGrid.y * 30}px`,
                width: `${(previewGrid.w / layoutConfig.cols) * 100}%`,
                height: `${previewGrid.h * 30}px`
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-blue-700">
                {previewGrid.w} × {previewGrid.h}
              </div>
            </motion.div>
          )}

          {/* 现有区域 */}
          {areas.map((area) => (
            <AreaComponent
              key={area.id}
              area={area}
              isSelected={selectedArea === area.id}
              cols={layoutConfig.cols}
              onMouseDown={(e) => handleAreaMouseDown(e, area)}
              onDelete={() => handleDeleteArea(area.id)}
              onEdit={(updates) => handleEditArea(area.id, updates)}
              onResize={(size) => handleResizeArea(area.id, size)}
            />
          ))}
        </div>

        {/* 空状态提示 */}
        {areas.length === 0 && !previewGrid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <Grid className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">开始创建你的布局</p>
              <p className="text-sm">在网格上拖拽鼠标创建第一个区域</p>
            </div>
          </div>
        )}
      </div>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-96 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">布局设置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    布局名称
                  </label>
                  <input
                    type="text"
                    value={layoutConfig.name}
                    onChange={(e) => setLayoutConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={layoutConfig.description}
                    onChange={(e) => setLayoutConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    网格列数
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="24"
                    value={layoutConfig.cols}
                    onChange={(e) => setLayoutConfig(prev => ({ ...prev, cols: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 区域组件
interface AreaComponentProps {
  area: LayoutArea;
  isSelected: boolean;
  cols: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onEdit: (updates: Partial<LayoutArea>) => void;
  onResize: (size: { w: number; h: number }) => void;
}

const AreaComponent: React.FC<AreaComponentProps> = ({
  area,
  isSelected,
  cols,
  onMouseDown,
  onDelete,
  onEdit,
  onResize
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(area.name);

  const handleNameSubmit = () => {
    onEdit({ name: editName });
    setIsEditing(false);
  };

  return (
    <motion.div
      className={twMerge(
        'absolute border-2 rounded-lg bg-white shadow-sm transition-all duration-200 cursor-move select-none',
        isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
          : 'border-gray-300 hover:border-gray-400'
      )}
      style={{
        left: `${(area.x / cols) * 100}%`,
        top: `${area.y * 30}px`,
        width: `${(area.w / cols) * 100}%`,
        height: `${area.h * 30}px`,
        minHeight: '60px'
      }}
      onMouseDown={onMouseDown}
    >
      {/* 区域标题栏 */}
      <div
        className="bg-gray-50 border-b border-gray-200 px-3 py-2 cursor-move flex items-center justify-between"
        onMouseDown={onMouseDown}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            className="text-sm font-medium bg-transparent border-none outline-none flex-1"
            autoFocus
          />
        ) : (
          <span 
            className="text-sm font-medium text-gray-700 flex-1 cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {area.name}
          </span>
        )}

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          >
            <Edit className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 区域内容 */}
      <div className="flex-1 overflow-hidden">
        {area.component ? (
          <div className="h-full w-full">
            {renderComponent(area.component)}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div className="text-gray-500 text-sm">
              {area.placeholder || '点击选择组件'}
              <div className="text-xs text-gray-400 mt-1">
                {area.w} × {area.h}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 调整大小的控制点 */}
      {isSelected && (
        <>
          {/* 调整大小的控制点 */}
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="se"
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
          />
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="e"
            className="absolute top-1/2 right-0 w-2 h-6 bg-blue-500 cursor-e-resize transform -translate-y-1/2"
          />
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="s"
            className="absolute bottom-0 left-1/2 w-6 h-2 bg-blue-500 cursor-s-resize transform -translate-x-1/2"
          />
        </>
      )}
    </motion.div>
  );
};

// 调整大小控制组件
interface ResizeHandleProps {
  area: LayoutArea;
  cols: number;
  onResize: (size: { w: number; h: number }) => void;
  direction: 'e' | 's' | 'se';
  className: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  area,
  cols,
  onResize,
  direction,
  className
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { w: area.w, h: area.h };
  }, [area.w, area.h]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    // 计算网格单位的变化
    const gridDeltaX = Math.round(deltaX / (window.innerWidth * 0.8 / cols)); // 假设网格占80%宽度
    const gridDeltaY = Math.round(deltaY / 30); // 每行30px

    let newW = startSize.current.w;
    let newH = startSize.current.h;

    if (direction.includes('e')) {
      newW = Math.max(1, Math.min(startSize.current.w + gridDeltaX, cols - area.x));
    }
    if (direction.includes('s')) {
      newH = Math.max(1, startSize.current.h + gridDeltaY);
    }

    if (newW !== area.w || newH !== area.h) {
      onResize({ w: newW, h: newH });
    }
  }, [isResizing, area.x, area.w, area.h, cols, direction, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
    />
  );
};