import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { X, Maximize2, Minimize2, Settings } from 'lucide-react';

export interface DraggableWidgetProps {
  id: string;
  title?: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  isDragging?: boolean;
  showControls?: boolean;
  isCollapsible?: boolean;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  id,
  title,
  children,
  onRemove,
  onSettings,
  className,
  headerClassName,
  bodyClassName,
  isDragging = false,
  showControls = true,
  isCollapsible = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleCollapse = () => {
    if (isCollapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <motion.div
      className={twMerge(
        'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden',
        'transition-all duration-200',
        isDragging && 'shadow-lg ring-2 ring-blue-500',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        height: isCollapsed ? 'auto' : 'auto'
      }}
    >
      {/* Widget Header */}
      {(title || showControls) && (
        <div className={twMerge(
          'flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100',
          'cursor-move select-none',
          headerClassName
        )}>
          <div className="flex items-center space-x-2">
            {/* Drag Handle */}
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-gray-400 rounded opacity-60"></div>
              <div className="w-1 h-4 bg-gray-400 rounded opacity-60"></div>
              <div className="w-1 h-4 bg-gray-400 rounded opacity-60"></div>
            </div>
            
            {title && (
              <h3 className="text-sm font-medium text-gray-700 truncate">{title}</h3>
            )}
          </div>

          {/* Controls */}
          {showControls && (
            <div className={twMerge(
              'flex items-center space-x-1 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {isCollapsible && (
                <button
                  onClick={handleToggleCollapse}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isCollapsed ? "展开" : "收起"}
                >
                  {isCollapsed ? (
                    <Maximize2 className="w-3 h-3 text-gray-500" />
                  ) : (
                    <Minimize2 className="w-3 h-3 text-gray-500" />
                  )}
                </button>
              )}
              
              {onSettings && (
                <button
                  onClick={() => onSettings(id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="设置"
                >
                  <Settings className="w-3 h-3 text-gray-500" />
                </button>
              )}
              
              {onRemove && (
                <button
                  onClick={() => onRemove(id)}
                  className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                  title="删除"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Widget Body */}
      <motion.div
        className={twMerge(
          'relative overflow-hidden',
          bodyClassName
        )}
        animate={{
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-4">
          {children}
        </div>
      </motion.div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize">
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-300 transform rotate-45"></div>
        </div>
      )}
    </motion.div>
  );
};

// Widget Factory - 用于快速创建拖拽组件
export const createDraggableWidget = (
  Component: React.ComponentType<any>,
  defaultProps?: any
) => {
  return React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
      <div ref={ref}>
        <DraggableWidget id={props.id || 'widget'} {...props}>
          <Component {...defaultProps} {...props.componentProps} />
        </DraggableWidget>
      </div>
    );
  });
};