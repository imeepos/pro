import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  component: React.ComponentType<any> | string;
  props?: any;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface GridContainerProps {
  items: GridItem[];
  onLayoutChange?: (items: GridItem[]) => void;
  cols?: number;
  rowHeight?: number;
  gap?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({
  items,
  onLayoutChange,
  cols = 12,
  rowHeight = 100,
  gap = 8,
  isDraggable = true,
  isResizable = true,
  className
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((itemId: string) => {
    setDraggedItem(itemId);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((itemId: string, x: number, y: number) => {
    setDraggedItem(null);
    setIsDragging(false);
    
    if (onLayoutChange) {
      const newItems = items.map(item => {
        if (item.id === itemId) {
          const newX = Math.round(x / ((100 / cols) + gap));
          const newY = Math.round(y / (rowHeight + gap));
          return { ...item, x: Math.max(0, Math.min(newX, cols - item.w)), y: Math.max(0, newY) };
        }
        return item;
      });
      onLayoutChange(newItems);
    }
  }, [items, cols, rowHeight, gap, onLayoutChange]);

  const getItemStyle = useCallback((item: GridItem) => {
    const widthPercent = (item.w / cols) * 100;
    const left = (item.x / cols) * 100;
    const top = item.y * (rowHeight + gap);
    const height = item.h * rowHeight + (item.h - 1) * gap;

    return {
      position: 'absolute' as const,
      left: `${left}%`,
      top: `${top}px`,
      width: `calc(${widthPercent}% - ${gap}px)`,
      height: `${height}px`,
      zIndex: draggedItem === item.id ? 1000 : 1
    };
  }, [cols, rowHeight, gap, draggedItem]);

  const containerHeight = Math.max(...items.map(item => item.y + item.h)) * (rowHeight + gap);

  return (
    <div 
      className={twMerge('relative w-full', className)}
      style={{ height: `${containerHeight}px`, minHeight: '400px' }}
    >
      {items.map((item) => {
        const Component = item.component;
        return (
          <motion.div
            key={item.id}
            style={getItemStyle(item)}
            drag={isDraggable}
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => handleDragStart(item.id)}
            onDragEnd={(_, info) => handleDragEnd(item.id, info.point.x, info.point.y)}
            whileDrag={{ 
              scale: 1.05, 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              zIndex: 1000
            }}
            className={twMerge(
              'bg-white rounded-lg border border-gray-200 overflow-hidden cursor-move',
              'shadow-sm hover:shadow-md transition-shadow duration-200',
              draggedItem === item.id && 'ring-2 ring-blue-500'
            )}
          >
            {isDraggable && (
              <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-4 bg-gray-400 rounded"></div>
                  <div className="w-1 h-4 bg-gray-400 rounded"></div>
                  <div className="w-1 h-4 bg-gray-400 rounded"></div>
                </div>
                {isResizable && (
                  <div className="w-3 h-3 border-r-2 border-b-2 border-gray-400 transform rotate-45"></div>
                )}
              </div>
            )}
            <div className="p-4 h-full">
              <Component {...(item.props || {})} />
            </div>
          </motion.div>
        );
      })}
      
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-50 pointer-events-none" />
      )}
    </div>
  );
};